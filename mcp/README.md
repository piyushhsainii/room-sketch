# RoomSketch MCP

RoomSketch's hosted MCP server lives here. The Next.js adapters are intentionally small; this directory owns authentication, schemas, tools, editing logic, previews, documentation, and MCP-specific tests.

This release is a **token-authenticated pilot**, suitable for connecting Codex and Claude Code to real saved projects. It is not yet the public OAuth onboarding flow described in the broader [implementation plan](../MCP_IMPLEMENTATION_PLAN.md).

## What works

- Stateless Streamable HTTP at `/api/mcp`, using the official MCP TypeScript SDK.
- Account-owned, expiring, hashed, revocable access tokens; read/write scopes and optional project restrictions.
- Token creation/revocation and client configuration examples at `/mcp`.
- Project listing, inspection, and idempotent creation subject to plan project limits.
- Catalog search for built-in GLB furniture and materials available to the account's plan.
- Previewing and atomically applying batches of rectangular room, door/window, furniture, material, and floor operations.
- Runtime argument validation; dimension locks, opening bounds, dependent-opening checks, and placement warnings.
- Canonical document persistence plus existing derived 3D scene/workspace conversion.
- Revision conflict detection, retry receipts, per-token request limits, and a bounded request body.
- Revision-bound schematic SVG floor previews, an MCP guide resource, and a design brief prompt.

MCP edits work without an editor tab being open. Open tabs currently require reload to see remote changes. An unsaved tab is not live-synchronized with MCP: save it before starting an agent session. A stale canonical save is rejected by the existing revision check.

## Setup

1. Install dependencies using the existing repository workflow. If npm reports the pre-existing payment-package/Next.js peer conflict, use `npm install --legacy-peer-deps`. Do not use `--force` to upgrade the application indiscriminately.
2. Apply `supabase/migrations/202611190002_mcp.sql` to the intended development/staging Supabase environment using your migration workflow. The migration assumes the existing projects table already has the workspace columns. It adds two tables and two service-role-only functions; it does not change existing project policies.
3. Configure these server environment variables:

   ```dotenv
   MCP_ENABLED=true
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-public-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-server-only-service-role-key
   ```

   The service key is used only inside server modules and must never be supplied to an MCP client. Existing browser login uses the public anon key. `MCP_ALLOWED_ORIGINS` optionally accepts a comma-separated list of additional browser origins for `/api/mcp`; native clients normally omit Origin. Token-management writes always require the deployment's own Origin.
4. Start RoomSketch with `npm run dev`.
5. Sign in at `http://localhost:3000/mcp` and create a token. Choose read/edit access to create projects. A project-restricted token can edit its selected existing projects but cannot create new ones.
6. Copy the token while it is displayed. The database stores its SHA-256 digest, not its plaintext. Default expiry is 30 days, maximum 90 days. Create a replacement if it is lost.

No live Supabase migration, deployment, or credential creation is performed by the test suite.

## Connect Codex

Set the secret in the environment from which you launch Codex. For a PowerShell session:

```powershell
$env:ROOMSKETCH_MCP_TOKEN = 'your-token-from-roomsketch'
```

Add this to your Codex configuration, substituting the actual local port or deployment URL:

```toml
[mcp_servers.roomsketch]
url = "http://localhost:3000/api/mcp"
bearer_token_env_var = "ROOMSKETCH_MCP_TOKEN"
```

For a desktop application launched earlier, the new shell environment may not be inherited. Configure the environment for that application and restart it, or launch a CLI client from the prepared shell. This pilot uses bearer tokens, so `codex mcp login` is not the connection flow.

## Connect Claude Code

A public, themed connection guide is available at `/docs/mcp`, linked from the application sidebar and landing page. It covers CLI setup and a downloadable local Claude Code plugin template at `/api/mcp/plugin-template`. Extract the template, set `ROOMSKETCH_MCP_TOKEN` in your environment, then launch `claude --plugin-dir ./roomsketch-plugin`. This is a local template, not a marketplace listing; no token is embedded. Codex continues to use direct MCP configuration.

Set `ROOMSKETCH_MCP_TOKEN` in the environment, then use this `.mcp.json` configuration:

```json
{
  "mcpServers": {
    "roomsketch": {
      "type": "http",
      "url": "http://localhost:3000/api/mcp",
      "headers": { "Authorization": "Bearer ${ROOMSKETCH_MCP_TOKEN}" }
    }
  }
}
```

Use `/mcp` in Claude Code to inspect the connection. Keep actual tokens out of committed configuration. Remote clients cannot reach your computer's localhost; use the deployed HTTPS endpoint for those clients.

## Verify the connection

```powershell
$env:ROOMSKETCH_MCP_URL = 'http://localhost:3000/api/mcp'
$env:ROOMSKETCH_MCP_TOKEN = 'your-token-from-roomsketch'
npm run mcp:smoke
```

This uses the official SDK client to initialize the connection, discover tools, read capabilities, and list projects. It does not create or change projects.

For a first editing test, ask the connected assistant:

> Read RoomSketch's capabilities. Create a project named MCP Test, then add a 4 m by 3 m bedroom, a door that fits on its north wall, and a chair from the catalog. Preview the batch, apply it, return the SVG preview and private editor link. Ask before reusing an existing project if my account has reached its project limit.

Then open the link and confirm that the 2D and 3D design is editable. Follow with a resize request and confirm that stale revisions and invalid opening placements are handled rather than overwritten.

## Tools

| Tool | Behavior |
| --- | --- |
| `get_capabilities` | Supported operations, coordinates, scopes, entitlements, limits |
| `list_projects` | Paginated owned projects, additionally filtered by grant |
| `get_project` | Latest revision and entity IDs; optional floor filter |
| `create_project` | Blank canonical project, initial floor, private editor URL |
| `search_catalog` | Paginated furniture/material IDs and dimensions/domains |
| `preview_changes` | Validate proposed edits without saving; IDs are provisional |
| `apply_changes` | Atomic commit with `base_revision` and retry-safe `request_id` |
| `validate_project` | Geometry errors and placement/layout warnings |
| `get_preview` | Schematic SVG text bound to the saved revision and requested floor |

The `roomsketch://guide` resource provides cross-tool instructions. The `design_house` prompt collects a design brief. All essential context is also provided through tools and server instructions.

### Batch example

Use actual project/floor IDs from the tools. `ref` is a batch-local alias for a newly created entity. Later operations can refer to it. Preview-generated IDs are not durable; use the IDs returned by the successful apply call.

```json
{
  "project_id": "uuid-from-create-project",
  "base_revision": "revision-from-get-project",
  "request_id": "a-new-uuid-for-this-write",
  "operations": [
    {
      "op": "add_room", "floor_id": "floor-id-from-project", "ref": "bedroom",
      "label": "Bedroom", "x": 0, "z": 0, "width": 4, "depth": 3
    },
    {
      "op": "add_opening", "floor_id": "floor-id-from-project", "ref": "door",
      "room_id": "bedroom", "type": "door", "wall": "north",
      "position": 1, "width": 0.9, "height": 2.1, "sill_height": 0
    }
  ]
}
```

Supported operations: `add_room`, `update_room`, `add_opening`, `place_furniture`, `move_furniture`, `set_room_material`, `remove_entity`, and `add_floor`. Read `schemas.ts` for exact runtime contracts. A room with openings cannot be deleted until those openings are explicitly removed in the batch. Moving a furnished room is rejected until furniture is handled separately. Resizing respects dimension locks and revalidates attached openings.

### Coordinates and dimensions

- Metres throughout the public tool API; convert feet before calling.
- A rectangular room's X/Z position is its minimum corner. Width runs along X and depth along Z.
- Tool `north` is the room's minimum-Z wall, `south` maximum Z, `west` minimum X, and `east` maximum X. This is a plan convention, not a surveyed geographical heading.
- An opening's position is its centre offset along the wall, measured from the room's minimum X or Z corner.
- Furniture position is its centre. Tool rotations use degrees, converted to the editor's stored radians. `get_project` converts them back to degrees.
- Furniture width/depth arguments describe target physical dimensions; the adapter compensates for the current renderer's 1.3 target multiplier. Returned inspection targets use physical dimensions. Model-specific orientation offsets remain the editor's responsibility.
- Existing polygon rooms, stairs, lights, outdoor items, and other unsupported entities are preserved, but cannot yet be authored through these commands.

## Request lifecycle

```text
POST /api/mcp
  -> enabled/origin/body checks
  -> hash bearer token, verify grant/expiry/revocation, consume rate allowance
  -> fresh SDK server and stateless HTTP transport for this request
  -> validate tool arguments
  -> verify scope and project ownership
  -> load canonical document
  -> apply operations on a clone and validate
  -> regenerate existing scene_json and workspace_config
  -> database transaction checks revision and saves document + retry receipt
  -> return IDs, revision, diagnostics, and private editor link
```

The assistant plans the layout on its side. The server performs application operations, not an additional model inference loop. The renderer stays in the user's browser. There is no VM, resident process, Redis session store, or background render worker required for these tools. The Next.js adapter uses the Node runtime and a 30-second request maximum; actual hosting limits must support that configuration.

The SDK implementation currently installed is 1.32.x. The automated handshake test exercises protocol `2025-11-25`; verify actual Codex/Claude Code versions during connected-client testing. Do not claim support for a newer protocol solely because newer specification pages exist.

## Security and persistence

- Tokens carry `projects:read` and optionally `projects:write`. All credential records belong to the signed-in account. Tokens have no implicit share/publication permissions.
- Elevated Supabase access is restricted to server code. Every project read explicitly filters `user_id`; grant restrictions are also checked. The write RPC repeats ownership, scope, expiry, and revocation checks at commit.
- Only `service_role` can execute MCP RPCs or access token hashes and operation receipts. Browser roles have no direct access to those tables/functions.
- A new SDK server and transport are created for each request, preventing cross-user mutable server/session state.
- MCP defaults off until explicitly enabled. Browser cookie refresh is bypassed only for `/api/mcp`; token management uses normal browser authentication plus same-origin checks.
- Maximum 120 authenticated requests per minute per token, 100 operations per batch, 256 KiB request body, 20 floors, and 2 MiB saved documents for MCP inspection. These are initial bounds to tune after measurement.
- `request_id` is scoped to a token. Reusing it with the same arguments returns the original result; changing the payload is rejected. The receipt and document update share a database transaction.
- The canonical revision remains compatible with the editor save endpoint. On conflict, read again and replan. Do not automatically overwrite with a fresh revision.
- MCP creates serialize per account and enforce current plan limits. The existing browser create route uses a separate count/insert path; unifying account-wide creation locking across both surfaces remains a follow-up.
- Retry receipts persist until token deletion. Define a retention policy before high-volume public rollout, retaining receipts for the documented retry window.
- Unexpected tool errors return a generic message; credentials are never logged. Known errors return codes such as `revision_conflict`, `invalid_geometry`, `insufficient_scope`, `unsupported_asset`, and `project_limit`.

The SVG is a schematic, not a photorealistic render. Room overlap and furniture-centre warnings are not full collision detection. Shared-wall topology repair, regulation checks, and design optimization are not implied by validation success.

## File map

| File | Responsibility |
| --- | --- |
| `handler.ts` | HTTP boundary, origin/body bounds, transport lifetime |
| `server.ts` | Tool, resource, prompt registration and structured results |
| `auth.ts` | Token hashing/authentication, scope/grant checks |
| `schemas.ts` | Public operation and token runtime schemas |
| `document-schema.ts` | Safe inspection of existing saved documents |
| `document.ts` | Pure editing, geometry diagnostics, document summaries |
| `catalog.ts` | Server-readable built-in catalog and material filtering |
| `service.ts` | Authorized project queries and transactional persistence |
| `preview.ts` | Safe, revision-associated SVG serialization |
| `scripts/smoke.mjs` | Real deployed/local read-only SDK connection check |
| `tests/` | Domain, HTTP protocol, auth, and embedded Postgres tests |
| `../app/api/mcp/route.ts` | Next.js MCP adapter |
| `../app/api/mcp/tokens/route.ts` | Cookie-authenticated credential management |
| `../app/mcp/` | Connection/token UI |
| `../supabase/migrations/202611190002_mcp.sql` | Database changes |

## Automated checks

```powershell
npm run test:mcp
npm test
npx tsc --noEmit
npm run build
npm run mcp:check-build
```

The MCP suite runs Jest tests plus real SQL against a disposable in-memory PGlite database. HTTP tests use the real SDK and transport with mocked persistence/token lookup; SQL tests independently execute the actual migration and RPC functions. They do not replace connected staging tests, managed Supabase RLS/infrastructure verification, or multi-connection concurrency/load tests. PGlite's minimal fixture does not recreate your entire production schema.

## Future scope

1. Public OAuth discovery/consent and compatible client registration; account connection settings and provider-backed grants.
2. Browser remote-change notifications and explicit unsaved-edit conflict resolution.
3. Polygon/shared-wall editing, stairs/roof/light/outdoor commands, full history and restore.
4. Background 3D previews and exports using the same renderer and permission-checked artifacts.
5. Custom GLB upload and generation, private asset metadata/storage, optimization, versioned asset references, and explicit community publishing. Supabase Storage can store the GLBs; generation requires a separate procedural or 3D-generation pipeline. Do not send binary GLBs through tool arguments.

Official references: [MCP SDK](https://github.com/modelcontextprotocol/typescript-sdk), [Codex MCP](https://developers.openai.com/codex/mcp), [Claude Code MCP](https://code.claude.com/docs/en/mcp).
