RenderAI — Full Project Context Document
What This App Does
RenderAI is a SaaS application that takes floor plan images uploaded by users and generates photorealistic 3D renders, optional videos, and an interactive 3D workspace viewer. Users upload a floor plan (PNG/JPG/PDF or SketchUp .skp), describe a style, choose an output type, and the app generates results using AI image models.

Tech Stack

Framework: Next.js 14 App Router with TypeScript
Database: Supabase (PostgreSQL) — accessed via admin client using service role key, NOT Supabase Auth
Auth: Custom JWT cookie-based session system. Cookie name: renderai_session. Uses readSessionFromCookies() from lib/auth/session.ts. Returns { userId, email }. Guest user ID is 00000000-0000-4000-8000-000000000000
Payments: Dodo Payments
3D Rendering: Three.js via @react-three/fiber and @react-three/drei
Image Generation: Three providers switchable via env var IMAGE_MODEL_PROVIDER: openai, nanobanana (actually Google Gemini), ideogram
Floor Plan Extraction: Google Gemini (gemini-2.0-flash) or OpenAI GPT-4o, switchable via WORKSPACE_EXTRACTION_PROVIDER
Styling: Mix of Tailwind utility classes and inline styles with CSS custom properties. Global CSS file uses ra- prefixed class names

Database Schema — projects table
Key columns used throughout the codebase:

id (uuid) — primary key
user_id (uuid) — references users table
name (text)
floorplan_url (text) — public Supabase storage URL
render_url (text, nullable) — generated render image URL
video_url (text, nullable)
status — uploaded | rendering | completed | failed
generation_type — render | render_video | workspace
style_context (text, nullable)
scene_json (jsonb, nullable) — extracted 3D geometry for workspace viewer
workspace_enabled (boolean, default false)
workspace_config (jsonb, nullable) — user's saved 3D scene configuration

There is also a project_generations table tracking individual generation attempts with render_url, video_url, style_context, parent_generation_id, edit_prompt.

File Structure
app/
(dashboard)/
DashboardClient.tsx — main client component, all state lives here
api/
generate/route.ts — POST: triggers render/video generation
edit/route.ts — POST: edits existing render
generations/route.ts — GET: loads generation history for a project
me/route.ts — GET: returns auth status, email, plan
projects/route.ts — GET: returns user's projects
upload/route.ts — POST: uploads floor plan image
upload-sketchup/route.ts — POST: uploads SketchUp .skp file
auth/logout/route.ts
workspace/
extract/route.ts — POST: AI extraction of floor plan → SceneJSON, saves to DB
config/route.ts — GET/POST: load/save workspace_config per project
save-manual/route.ts — POST: saves manually drawn floor plan to DB

components/
sidebar/
Sidebar.tsx — navigation only, no generate controls
ProjectItem.tsx
generate/
GeneratePanel.tsx — contains StyleContextInput + Generate CTA + output type selector
StyleContextInput.tsx — textarea with QuickStyleSelector dropdown, file pill, auto-resize
GenerationLoader.tsx
GenerateOptions.tsx
upload/
UploadZone.tsx — compact pill toggle (Browse Files / SketchUp), FilePill after upload
FilePreview.tsx
viewer/
CarouselViewer.tsx
LightboxModal.tsx
ProjectAssets.tsx
RenderViewer.tsx
workspace/
WorkspaceCanvas.tsx — Canvas wrapper, consumes WorkspaceConfig, renders 3D scene
WorkspaceContainer.tsx — loads scene_json + workspace_config from DB, launches canvas
WorkspaceConfigPanel.tsx — config panel (rooms tab: wall color, floor material, door style; scene tab: sliders, toggles)
WorkspaceLoader.tsx
WorkspaceToolbar.tsx
FloorplanMinimap.tsx
FloorPlanEditor.tsx — interactive floor plan drawing editor (nodes + walls + openings)
FloorPlanEditorModal.tsx — modal wrapper for FloorPlanEditor
three/
CameraController.tsx — orbit/topdown/walk modes, WASD, wall collision
RoomFloor.tsx — PlaneGeometry floors, PBR textures from /public/textures/
RoomWall.tsx — wall panels with door gaps, door leaf, door frame, handle, windows
RoomCeiling.tsx
RoomFurniture.tsx — procedural furniture per room type
RoomGroup.tsx
RoomLabel.tsx
SceneLighting.tsx — accepts ambientIntensity prop from WorkspaceConfig
dashboard/
DashboardClient.tsx
marquee/
MarqueeSection.tsx
ui/
AuthDialog.tsx
StatusBadge.tsx

lib/
auth/
session.ts — readSessionFromCookies(), createSessionCookie(), AppSession type
supabase/
admin.ts — createSupabaseAdmin() using service role key
server.ts — createServerSupabaseClient() for Supabase Auth (not used for main auth)
workspace/
sceneBuilder.ts — getWallSegments, getSceneBounds, getSceneWallSegments (deduplication), getWalkStartPosition, detectRoomType, getRoomBounds
floorPlanConverter.ts — converts FloorPlanEditor state (nodes+walls+openings) → SceneJSON
errorMessage.ts
format.ts
imageGen.ts — generateRender() + editRender(), supports openai/nanobanana/ideogram
videoGen.ts
planGate.ts — checkCanGenerate(), incrementUsage()
models.ts — Project, ProjectGeneration TypeScript types
errorMessage.ts

types/
workspace.ts — SceneJSON, SceneRoom, WallPoint, RoomDoor, RoomWindow, WorkspaceConfig, DoorStyle, FloorMaterial, RoomConfig, CameraMode, WorkspaceStatus, DEFAULT_WORKSPACE_CONFIG

constants/
content.ts — all UI strings, STYLE_CONTEXT.presets, GENERATE.steps, WORKSPACE, etc.

supabase/
types.ts — auto-generated DB types (run: npx supabase gen types typescript)

public/
textures/ — PBR texture files from ambientcg.com (downloaded locally, not fetched at runtime)
WoodFloor044_1K-JPG_Color.jpg / \_NormalGL.jpg / \_Roughness.jpg
Marble022_1K-JPG_Color.jpg / \_NormalGL.jpg / \_Roughness.jpg
Tiles101_1K-JPG_Color.jpg / \_NormalGL.jpg / \_Roughness.jpg
Fabric049_1K-JPG_Color.jpg / \_NormalGL.jpg / \_Roughness.jpg
Concrete025_1K-JPG_Color.jpg / \_NormalGL.jpg / \_Roughness.jpg
Plaster001_NormalGL.jpg / \_Roughness.jpg
Wood049_1K-JPG_Color.jpg / \_NormalGL.jpg / \_Roughness.jpg

Environment Variables
bash# Auth
AUTH_JWT_SECRET=
DISABLE_AUTH=false # set true for guest mode

# Supabase

NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Image generation

IMAGE_MODEL_PROVIDER=openai # openai | nanobanana | ideogram
OPENAI_API_KEY=
OPENAI_IMAGE_MODEL=gpt-image-1

# Nanobanana = actually Google Gemini image gen

NANO_BANANA_API_KEY= # Google API key
NANO_BANANA_MODEL=gemini-2.0-flash-preview-image-generation

# Ideogram

IDEOGRAM_API_KEY=
IDEOGRAM_IMAGE_WEIGHT=40 # LOW (35-45) = layout reference only, applies full 3D render
IDEOGRAM_EDIT_IMAGE_WEIGHT=65
IDEOGRAM_RENDERING_SPEED=DEFAULT
IDEOGRAM_NUM_IMAGES=2
IDEOGRAM_MAGIC_PROMPT=OFF

# style_type is hardcoded to REALISTIC in code (not configurable via env)

# model field is NOT sent to V3 endpoints (implicit)

# Floor plan extraction

WORKSPACE_EXTRACTION_PROVIDER=gemini # gemini | openai
GEMINI_API_KEY=
GEMINI_EXTRACTION_MODEL=gemini-2.0-flash

Critical Architecture Decisions
Auth pattern: Every API route uses readSessionFromCookies() not supabase.auth.getUser(). The app has its own JWT session system. Using Supabase Auth methods returns null and causes "Unauthorized" errors. The only exception is workspace/extract/route.ts and workspace/save-manual/route.ts which save by project_id alone using the admin client — no auth check needed for those.
Database writes: Always use createSupabaseAdmin() for writes, never the server Supabase client. The admin client bypasses RLS. Save by project_id directly — do not gate saves on userId matching.
SceneJSON format: All coordinates in meters. (0,0) = top-left corner of floor plan. x increases left→right (West→East). z increases top→bottom (North→South). Room shapes are axis-aligned rectangles only (4 points, clockwise from top-left). Door position = distance in meters from the left/top corner of the named wall to door center. All rooms must have adjacent walls sharing exact coordinates (no gaps).
Wall deduplication: getSceneWallSegments() in sceneBuilder.ts deduplicates shared walls between adjacent rooms. Walls are rendered at scene level in WorkspaceCanvas, not per-room. WallSegment objects have a roomId field used by WorkspaceConfigPanel to apply per-room wall color.
Floor rendering: Uses PlaneGeometry (not ShapeGeometry) positioned at room center (bounds.minX + width/2, bounds.minZ + depth/2). ShapeGeometry had UV offset issues causing floors to appear outside the building. DoubleSide material prevents face-normal issues.
WorkspaceConfig: Saved to workspace_config DB column. Loaded by WorkspaceContainer before canvas renders. Changes apply instantly (React state). Per-room overrides stored in config.rooms[] as { roomId, wallColor, floorMaterial }. Global settings: ambientIntensity, wallRoughness, showFurniture, showLabels, fogEnabled, doorStyle.
Camera modes: orbit (default), topdown, walk. Walk mode uses WASD keys, FOV 80, wall collision detection. Mode change resets camera via cameraResetKey increment.
Generate CTA: Moved from Sidebar to inline in GeneratePanel.tsx. Output type pills (Render only / Render+Video / Explore in 3D) with color-coded accents (indigo/sky/violet). Button label changes based on hasSceneJson — shows "Explore in 3D" if scene_json exists in DB, else "Generate 3D View".
Ideogram V3 API: Uses /v1/ideogram-v3/remix endpoint. No model field (implicit in V3). Valid style_type values: AUTO, GENERAL, REALISTIC, DESIGN, FICTION — RENDER_3D does NOT exist. image_weight: 40 is intentionally low so Ideogram uses floor plan for spatial layout only and applies full 3D rendering from the prompt. Negative prompt is critical to prevent 2D output reproduction.
Dual-image extraction: extractWithGemini() accepts an optional second image (renderB64). When a project has render_url, both the floor plan AND the 3D render are sent to Gemini. Floor plan = sole source for geometry/doors/windows. 3D render = source for floor_material and wall_color only.

SceneJSON Type Reference
typescripttype SceneJSON = {
rooms: SceneRoom[]
furniture: any[]
extracted_at: string
floorplan_url: string
}

type SceneRoom = {
id: string // snake_case unique
name: string
shape: WallPoint[] // exactly 4 points, clockwise from top-left
height: number // metres, typically 2.7
floor_material: 'hardwood' | 'tile' | 'carpet' | 'concrete' | 'marble'
wall_color: string // hex color
doors: RoomDoor[]
windows: RoomWindow[]
}

type WallPoint = { x: number; z: number }

type RoomDoor = {
wall: 'north' | 'south' | 'east' | 'west'
position: number // metres from left/top corner of wall to door CENTER
width: number // metres, typically 0.9
}

type RoomWindow = {
wall: 'north' | 'south' | 'east' | 'west'
position: number
width: number
height: number
sillHeight: number // distance from floor to bottom of window
}

WorkspaceConfig Type Reference
typescripttype WorkspaceConfig = {
rooms: RoomConfig[] // per-room overrides
ambientIntensity: number // 0.5–4.0, default 2.5
wallRoughness: number // 0.1–1.0, default 0.82
showFurniture: boolean
showLabels: boolean
fogEnabled: boolean
doorStyle: DoorStyle
}

type RoomConfig = {
roomId: string
wallColor: string
floorMaterial: FloorMaterial
}

type DoorStyle = 'wood_oak' | 'wood_dark' | 'wood_white' | 'glass_frosted' | 'glass_clear' | 'metal_steel' | 'panel_white'
type FloorMaterial = 'hardwood' | 'marble' | 'tile' | 'carpet' | 'concrete'

Do's and Don'ts
DO:

Always use readSessionFromCookies() for auth in API routes — never supabase.auth.getUser()
Always use createSupabaseAdmin() for DB writes
Save scene_json by project_id only — no auth gating on the save
Return scene_json from extract route even if DB save fails (non-fatal)
Use PlaneGeometry for floors, never ShapeGeometry
Keep wall deduplication at scene level via getSceneWallSegments()
Pass wallRoughness from WorkspaceConfig through to RoomWall
Pass ambientIntensity from WorkspaceConfig through to SceneLighting
Use DoubleSide on all floor materials
Keep the extract route (workspace/extract/route.ts) and manual save route (workspace/save-manual/route.ts) completely separate
When asking for file changes, specify only what changed — don't rewrite the entire file
When showing code that references existing functions, confirm the function signatures still match before assuming they work

DON'T:

Don't add model field to Ideogram V3 API calls — it's not accepted
Don't use RENDER_3D as style_type for Ideogram — it doesn't exist
Don't set image_weight above 70 for Ideogram generate — it causes the model to reproduce the 2D floor plan instead of rendering 3D
Don't use ShapeGeometry for floors — it causes UV offset issues where textures appear outside room bounds
Don't hardcode Z-offsets in RoomFloor position (the + 4.59 bug) — always use bounds.minX and bounds.minZ directly
Don't gate DB saves on userId matching in the workspace extract routes — the app uses a custom auth system and supabase.auth.getUser() returns null
Don't put generate controls in the Sidebar — they live in GeneratePanel.tsx in the main content area
Don't use ra-uploadZone CSS class with inline styles simultaneously — the CSS overrides inline styles
Don't add ground plane mesh to WorkspaceCanvas — it extends outside the building footprint; use Canvas background color instead
Don't reverse shape winding for floor meshes — use DoubleSide material instead
Don't send the full file when only one function changed — specify the exact function or block to replace

Known Bugs Fixed (don't reintroduce)

Floor offset + 4.59 — someone manually patched a Z offset into RoomFloor position that shifted all floors. Always use bounds.minZ directly.
ShapeGeometry UV — rooms at x=9..14 produced textures starting at UV (9,0) instead of (0,0). Fixed by switching to PlaneGeometry.
Ideogram returning 2D floor plan — caused by image_weight: 75+ and RENDER_3D style type (doesn't exist). Fixed by image_weight: 40 and REALISTIC.
Unauthorized on workspace config save — caused by using createServerSupabaseClient() which relies on Supabase Auth. Fixed by using readSessionFromCookies() matching other routes.
scene_json not saving after extraction — caused by gating DB write on userId && p.user_id === userId. Since the app uses custom JWT auth, supabase.auth.getUser() returns null so userId was always null. Fixed by saving by project_id only.
Door leaf pointing wrong direction — trigonometry-based open angle introduced rotation bugs. Fixed by simple 90° rotation: rotY + Math.PI/2 with leaf center at doorWorldLeft + door.width/2 inward.
Gemini JSON truncation — maxOutputTokens too low and no responseMimeType. Fixed by setting maxOutputTokens: 8192 and responseMimeType: 'application/json'.
