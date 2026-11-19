# Environments, feature flags, testing, and releases

Status: proposed implementation plan, 19 November 2026. No infrastructure or application behavior has been changed.

## Recommended architecture

Keep one repository and one application codebase. Select environment-specific resources through validated configuration. Deploy each environment separately; do not add an environment selector to the public application.

Assumption: Vercel hosts the application, based on existing URLs and dependencies. Verify the actual hosting and Git integration before implementing deployment workflows.

| Environment | Application | Supabase | External services |
| --- | --- | --- | --- |
| Local | localhost:3000, APP_ENV=local | Local Supabase stack | Payment sandbox, captured email, mocked AI by default |
| Staging | Stable staging hostname, APP_ENV=staging | Separate hosted staging project | Sandbox payments, restricted test email, optional budgeted real AI |
| Production | Existing public hostname, APP_ENV=production | Existing production project | Live payments and production integrations |

PR previews use staging configuration initially and synthetic test accounts. Shared staging data is not isolated per PR: serialize destructive integration tests, namespace test records, and never allow arbitrary PR schema migrations against shared staging. Add isolated Supabase preview branches later if needed. Local Supabase requires a container runtime; a dedicated hosted development project is the fallback, rather than connecting local development to production.

## Findings in this repository

- Next.js 16 App Router with Supabase SSR clients.
- `app/(auth)/login/GoogleSignIn.tsx` already builds `redirectTo` from `window.location.origin`, with `/auth/callback` and a `next` query parameter.
- `app/auth/callback/route.ts` exchanges the OAuth code; return-path validation already exists in `lib/auth/return-path.ts`.
- `lib/flags.ts` currently contains only the public waitlist flag.
- `lib/planGate.ts` bypasses usage limits based on NODE_ENV; this cannot distinguish staging from production builds. Check whether this older module is active before changing its behavior.
- `lib/auth/session.ts` allows DISABLE_AUTH without checking the application environment. Inventory its callers alongside Supabase auth and the custom Google endpoint.
- Supabase admin implementations use both SUPABASE_SERVICE_KEY and SUPABASE_SERVICE_ROLE_KEY.
- `package.json` hardcodes a Supabase project ID for type generation.
- Migration filenames mix timestamp formats and untimestamped SQL. At least one ALTER TABLE script sorts before the initial schema. Clean rebuilds are not yet demonstrated.
- Jest exists, but discovery is limited to workspace tests. No tracked GitHub Actions configuration was found.
- The README and `env.example` disagree about variable names and the example filename. Some email/metadata URLs are hardcoded to the public domain.

These findings identify implementation work; they do not establish the current dashboard configuration or the root cause of the observed redirect failure.

## Phase 1: Fix authentication configuration

Supabase has one default Site URL and multiple allowed Redirect URLs. Changing Site URL between local and production should not be necessary.

1. Inspect Authentication > URL Configuration in the existing project. Keep Site URL set to the production origin. Add the local and production callbacks to the redirect allowlist as a short-term fix.
2. Account for the current dynamic `?next=...` callback query when verifying allowlist matching. Prefer a stable callback URL with a short-lived, validated return-path cookie if exact matching does not accommodate the current flow; do not broaden the production allowlist globally.
3. Complete Google login on localhost and production without changing dashboard settings between runs. Inspect the outgoing redirect_to parameter if either fails.
4. Distinguish Google's authorized OAuth redirect URI (the Supabase project's `/auth/v1/callback`) from the application's allowed `/auth/callback` destination. Configure each Supabase project's provider callback, including the local Auth callback if using Google with the local stack.
5. After isolation, give staging its own Site URL/provider configuration and production its production-only destinations. Restrict preview wildcard patterns to project-owned URLs in the non-production project.
6. Inventory custom Google and ChatGPT auth paths, email callbacks, logout, cookie settings, and forwarded-origin handling. Their configuration must match the selected environment too.

Done when local, staging, and production logins return to their originating environment, return paths stay internal, and sessions cannot cross environments. Automated tests cover callback processing; run real Google OAuth smoke checks separately rather than automating Google's consent UI.

## Phase 2: Centralize environment configuration and isolate resources

Introduce `lib/config/server.ts` and `lib/config/public.ts` with typed validation and a single documented variable contract.

Proposed server configuration:

```dotenv
APP_ENV=local
APP_URL=http://localhost:3000
SUPABASE_SERVICE_ROLE_KEY=<server-only>
AUTH_JWT_SECRET=<unique-per-environment>
PAYMENTS_MODE=test
EMAIL_MODE=capture
AI_MODE=mock
AUTH_BYPASS_ENABLED=false
USAGE_LIMITS_BYPASS_ENABLED=false
```

Keep the existing public Supabase URL and anon key for browser access. Expose only the safe environment label and evaluated UI flags to clients through server-provided configuration. Consolidate APP_URL/SITE_URL conventions and migrate existing provider variable names deliberately rather than leaving duplicate sources of truth.

- APP_ENV accepts local, staging, or production. NODE_ENV retains its normal development/test/production meaning; never set it to staging.
- Local startup may default to local; hosted deployments must explicitly declare and validate APP_ENV. Check consistency with the hosting environment.
- Reject unknown environments, non-production use of the known production Supabase project, production auth/usage bypasses, and non-production live payment configuration.
- Isolate databases, auth users, storage buckets, signing secrets, webhook secrets, payment products, and email routing. Use synthetic seeds; do not copy production user data into staging.
- Consolidate service-role key handling and remove the hardcoded type-generation project target.
- Add safe example files and explicit local commands. Do not assume Next.js automatically loads `.env.staging`; use deployment settings or an explicit loader if a special file is needed.
- Keep production credentials out of preview builds and untrusted PR jobs. Local bypasses remain opt-in so realistic local testing remains possible.

Next.js NEXT_PUBLIC variables are embedded at build time. Initially build separately for each environment from the same reviewed commit. Never promote a staging build containing staging browser credentials into production. A future build-once strategy requires runtime public configuration.

Done when changing the environment selects the complete resource set consistently and invalid combinations fail before serving traffic.

## Phase 3: Add feature flags with runtime rollback

Extend the existing flag entry point into a typed registry. Start with a small Supabase-backed configuration store in each hosted project, a server evaluator, and read-only evaluated flags passed to the UI. This uses the current stack and supports changes without a rebuild.

- Each flag records its key, default, owner, purpose, and removal date. Experimental features default off in production.
- Support environment defaults, an authenticated internal tester allowlist, and then deterministic percentage rollout by stable user ID. Start with boolean and internal-user targeting; percentages can follow.
- Enforce flags in API routes and background work as well as UI. Flags never substitute for authentication, ownership, RLS, or plan entitlement checks.
- Restrict flag writes to authenticated operators, with audit history. Users cannot enable server behavior through query parameters, local storage, or public environment variables.
- Use a maximum 30-second cache lifetime, including evaluated client configuration refresh where relevant. Unknown flags and unavailable configuration use documented safe defaults; experimental write paths fail closed after cache expiry.
- Keep a feature's previous code path available through the rollback window. Disabling a flag stops new operations; already-running jobs and writes need separate handling.
- Add a registry version/minimum application version for compatibility so an older deployment cannot enable unsupported behavior.

Example rollout: local on -> staging on -> production internal users -> 10% -> 50% -> all users. Advance only after auth, saves, and error rates are healthy. Avoid percentage rollout for incompatible saved-document changes.

Done when a production feature can be disabled without a deploy and direct API calls respect the disabled state within the documented cache window.

## Phase 4: Make schema and saved files compatible with rollback

1. Compare repository migrations with remote migration history and the actual production schema, including RLS, functions, triggers, storage policies, and required extensions.
2. Establish a reproducible baseline and correctly ordered future timestamped migrations. Do not rename applied migrations or repair remote history blindly. Preserve existing history and document any deliberate reconciliation.
3. Add local Supabase configuration and synthetic seeds. Demonstrate a clean local rebuild and production-like upgrade in CI before enabling automated remote migrations.
4. Use additive migrations first: new nullable columns/tables, compatible readers, backfill, then switch writes. Remove old schema only after the supported rollback window has closed.
5. Version saved floor-plan/scene documents and test old-reader compatibility. A database migration can be additive while a new JSON shape still breaks the previous editor.
6. Run migrations once per environment through a serialized deployment job with an explicit target. Never run them at application startup or in every preview build.

Application rollback does not reverse database writes, external API actions, or payments. Use forward corrective migrations by default. Define backup/restore procedures and verify available recovery coverage separately; restoring a database may lose newer writes and is incident recovery, not a normal release rollback.

Done when the previous supported application release still reads and saves correctly against the new schema and document formats.

## Phase 5: Add test and deployment gates

Use short-lived feature branches and one protected main branch. Avoid a permanent develop branch initially: deploy the reviewed release candidate to stable staging, then release that same Git SHA using production configuration.

PR checks:

- Reproducible install using one chosen lockfile/package manager, lint, TypeScript checking, current Jest tests, and a production build with safe test configuration.
- Expand Jest discovery and add meaningful tests for environment validation, flag targeting/fallback, return-path safety, plan gating, and saved-document compatibility.
- Local Supabase integration tests for RLS/ownership, API behavior, migrations, and webhook idempotency. Use sandbox webhook fixtures and verify signatures.
- Playwright smoke tests for login/session handling with controlled test users, dashboard, project creation, edit/save/reload, sharing, logout, and disabled-feature API access. Keep a separate real-provider OAuth check.
- Establish existing lint/type/build failures as a baseline and resolve release-blocking failures; do not bypass them with broad ignore settings.

Release workflow:

1. Pin a candidate SHA and serialize releases.
2. Apply compatible staging migrations, deploy staging from that SHA, and run smoke/integration tests.
3. Record the staging result and require deliberate production release authorization in the hosting/Git workflow.
4. Build a production candidate from the same SHA with production configuration; apply compatible production migrations before routing requests to code that needs them.
5. Switch production traffic only after gates pass. Configure Vercel so an ordinary Git push cannot independently bypass this ordering.
6. Run safe production smoke checks against a dedicated test account; observe error and save-failure rates. Keep new flags disabled or internal-only initially.

Done when a failed staging or CI check prevents production release, and staging-tested source plus production configuration identifies every production deployment.

## Phase 6: Version releases and rehearse recovery

- Use semantic application versions and Git release tags, plus Git SHA, deployment ID, schema migration version, flag configuration version, and document schema version in a release manifest.
- Record error logs and metrics with environment/release labels. Add a safe version/health endpoint and a staging environment badge. Do not expose secrets or user data in diagnostics.
- Preserve a known-good production deployment and confirm rollback eligibility/retention on the actual Vercel plan. Define a five-minute recovery target, then measure it in a rehearsal.
- Recovery sequence: disable the suspect feature; if needed restore the previous production deployment; verify login/save/reload; prevent the next automated release from reintroducing the incident; revert/fix the source through the normal pipeline.
- A deployment rollback restores its build configuration, not whatever environment settings were most recently edited. Keep compatible secrets valid through the rollback window and record necessary configuration changes.
- Rehearse in staging after additive schema and document-format changes. Include flag-store failure and a failed migration, not just a UI regression.

Done when recovery is documented and demonstrated, and the restored application works with the current database and external configuration.

## Implementation order and expected deliverables

1. Auth allowlist verification and provider callback checklist.
2. Typed configuration, isolated local/staging resources, corrected examples and setup docs.
3. Reconciled migration baseline, synthetic seeds, and reproducible rebuild checks.
4. Typed runtime flags and an audited operator update path.
5. Expanded tests, CI, serialized staging/production workflows, and release manifest.
6. Monitoring, rollback runbook, and a recorded recovery rehearsal.

Keep this as incremental changes so configuration isolation can ship before the full release pipeline. Confirm hosting, staging hostname, container-runtime availability, and account-level feature availability during implementation; no new paid service is required by this plan without first checking those constraints.

## Reference documentation

- Supabase redirect configuration: https://supabase.com/docs/guides/auth/redirect-urls
- Supabase environment/migration workflow: https://supabase.com/docs/guides/deployment/managing-environments
- Next.js build-time public variables: https://nextjs.org/docs/app/guides/environment-variables
- Vercel environment separation: https://vercel.com/docs/deployments/environments
- Vercel instant rollback and configuration caveats: https://vercel.com/docs/instant-rollback
