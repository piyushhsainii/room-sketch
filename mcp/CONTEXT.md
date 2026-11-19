# Context for future changes

Read README.md before modifying this integration.

The MCP server is a stateless adapter in the existing Next.js application. Authentication uses account-owned opaque pilot tokens, not browser cookies and not an OAuth implementation. Store only token digests. Do not add shared global state containing users, projects, or SDK sessions.

The canonical design is the existing multi-floor ProjectFloorPlan plus SceneConfig and its opaque revision. Never save an independent agent-generated scene_json without updating the canonical document. Reuse the existing scene converter. Keep browser/client imports out of the server path: lib/helpers.ts is client-only, which is why the converter now imports its small ID helper from lib/workspace/entity-id.ts.

New commands belong in schemas.ts and document.ts, not inside individual tool callbacks. Preserve unsupported editor data. Validate inputs at runtime, respect dimension locks/dependent entities, and commit all derived state plus idempotency receipt together. Persisted furniture rotation is radians; public MCP rotation is degrees. The renderer multiplies horizontal target dimensions by 1.3; the adapter compensates at its boundary.

Every read must check both token project restrictions and database ownership. The elevated database client makes these checks mandatory. The write RPC repeats authorization at commit. Keep the RPC executable only by service_role. Avoid adding direct client policies for token hashes or operation receipts.

Public OAuth, live browser synchronization, polygon authoring, heavy renders/exports, and custom/community GLB assets are future scope. Capability responses must describe actual behavior, not the long-term plan. Never claim a server save updates an unsaved browser document automatically.

Run npm run test:mcp, npm test, and TypeScript checks after changes. Use the read-only smoke script for a configured real deployment. SQL tests use embedded Postgres and never connect to live Supabase.
