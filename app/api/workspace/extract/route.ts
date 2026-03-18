import OpenAI from "openai";
import { NextResponse } from "next/server";

import { WORKSPACE } from "@/constants/content";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Database, Json } from "@/supabase/types";
import type {
  RoomDoor,
  RoomWindow,
  SceneJSON,
  SceneRoom,
  WallPoint,
} from "@/types/workspace";

export const runtime = "nodejs";

// ── Extraction prompt ─────────────────────────────────────────────────────────
// Used by both OpenAI and Gemini — same instructions, same JSON schema

const EXTRACTION_SYSTEM_PROMPT = `You are a precise architectural floor plan parser.
Your ONLY job is to convert a 2D floor plan image into accurate JSON geometry for 3D rendering.

═══════════════════════════════════════════════════════
OUTPUT RULES — VIOLATING ANY OF THESE WILL BREAK THE 3D VIEWER
═══════════════════════════════════════════════════════
1. Return ONLY raw JSON. Zero markdown. Zero code fences. Zero explanation. Zero preamble.
   The very first character of your response must be { and the very last must be }.
2. Every coordinate is in METERS. Use real-world architectural measurements.
3. (0,0) is the TOP-LEFT corner of the entire floor plan bounding box.
4. x increases LEFT → RIGHT (West → East).
5. z increases TOP → BOTTOM (North → South).
6. All rooms must be AXIS-ALIGNED RECTANGLES ONLY.
   Diagonal walls, L-shapes, and irregular polygons are NOT supported.
   Simplify any non-rectangular space to its tightest bounding rectangle.
7. All coordinates must be >= 0. No negative values.
8. Adjacent rooms MUST share exact wall coordinates — no gaps, no overlaps.
   Example: if Room A ends at x=4.0, Room B next to it starts at x=4.0 exactly.
9. Room shapes are listed CLOCKWISE from TOP-LEFT:
   [top-left, top-right, bottom-right, bottom-left]

═══════════════════════════════════════════════════════
MEASUREMENT APPROACH
═══════════════════════════════════════════════════════
Step 1: Identify the overall building footprint width and height in meters.
Step 2: Divide it into a grid. Each room occupies a rectangular cell.
Step 3: Assign x/z coordinates so the entire building fits within the grid.
Step 4: Double-check: sum of room widths along any row must equal total building width.
Step 5: Double-check: sum of room depths along any column must equal total building depth.

TYPICAL ROOM SIZES for scale reference:
- Master bedroom: 3.5–4.5m wide × 4.0–5.0m deep
- Secondary bedroom: 3.0–3.5m wide × 3.0–4.0m deep
- Living/lounge: 4.0–6.0m wide × 4.0–5.5m deep
- Kitchen: 2.5–4.0m wide × 3.0–4.5m deep
- Bathroom/WC: 1.8–2.5m wide × 2.0–3.0m deep
- Hallway/corridor: 1.0–1.5m wide
- Dining room: 3.0–4.0m wide × 3.0–4.0m deep
- Study/office: 2.5–3.5m wide × 3.0–4.0m deep
- Typical ceiling height: 2.7m

═══════════════════════════════════════════════════════
DOOR RULES
═══════════════════════════════════════════════════════
- wall: "north" = top edge of room, "south" = bottom, "east" = right, "west" = left
- position = distance in METERS from the LEFT or TOP corner of that wall to the CENTER of the door
- width: interior door = 0.9m, main entrance = 1.0–1.2m, bathroom = 0.8m
- Every room that is accessible must have at least one door
- Doors between adjacent rooms should appear on the shared wall in BOTH rooms
  (same position relative to each room's local coordinate system)

═══════════════════════════════════════════════════════
WINDOW RULES
═══════════════════════════════════════════════════════
- Only place windows on EXTERIOR walls (walls that face outside the building)
- position = distance in meters from left/top corner of wall to window center
- width: standard window 1.0–1.5m, large window 1.8–2.4m
- height: 1.0–1.2m typical
- sillHeight: 0.9m typical (distance from floor to bottom of window)

═══════════════════════════════════════════════════════
FLOOR MATERIAL RULES
═══════════════════════════════════════════════════════
bathroom / WC / toilet / wet room → "tile"
kitchen → "tile"
bedroom / master bedroom / guest room → "hardwood"
living room / lounge / family room / sitting room → "hardwood"
dining room → "hardwood"
hallway / corridor / entrance / foyer / entry → "tile"
study / office / library → "hardwood"
utility / laundry / garage → "concrete"

═══════════════════════════════════════════════════════
WALL COLOR RULES (warm neutral tones)
═══════════════════════════════════════════════════════
living room / lounge → "#E8E0D4"
bedroom → "#EAE8F0"
kitchen → "#ECEAE5"
bathroom / WC → "#E5ECEA"
hallway / corridor → "#E8E6E0"
dining room → "#EAE4D8"
study / office → "#E4E8EE"
other → "#EAE8E4"

═══════════════════════════════════════════════════════
REQUIRED JSON STRUCTURE
═══════════════════════════════════════════════════════
{
  "rooms": [
    {
      "id": "living_room",
      "name": "Living Room",
      "shape": [
        {"x": 0.0, "z": 0.0},
        {"x": 5.5, "z": 0.0},
        {"x": 5.5, "z": 4.5},
        {"x": 0.0, "z": 4.5}
      ],
      "height": 2.7,
      "floor_material": "hardwood",
      "wall_color": "#E8E0D4",
      "doors": [
        {"wall": "east", "position": 1.5, "width": 0.9}
      ],
      "windows": [
        {"wall": "north", "position": 1.5, "width": 1.2, "height": 1.0, "sillHeight": 0.9}
      ]
    }
  ],
  "furniture": []
}

═══════════════════════════════════════════════════════
VALIDATION CHECKLIST — verify before returning
═══════════════════════════════════════════════════════
□ Response starts with { and ends with }
□ Every room has exactly 4 shape points
□ No coordinate is negative
□ Adjacent rooms share exact wall coordinates
□ Every door position + width/2 <= wall length
□ Every window position + width/2 <= wall length  
□ Every room has a unique id (snake_case, no spaces)
□ All floor_material values are one of: hardwood, tile, carpet, concrete, marble
□ furniture array is always present (empty array is fine)`;

// ── Helpers ───────────────────────────────────────────────────────────────────

type Body = { project_id: string };
type ProjectRow = Database["public"]["Tables"]["projects"]["Row"];

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function isFiniteNumber(n: unknown): n is number {
  return typeof n === "number" && Number.isFinite(n);
}

function toFiniteNumber(n: unknown): number | null {
  const v = typeof n === "number" ? n : Number(n);
  return Number.isFinite(v) ? v : null;
}

function asRecord(v: unknown): Record<string, unknown> | null {
  if (!v || typeof v !== "object") return null;
  return v as Record<string, unknown>;
}

function isWallDirection(v: unknown): v is RoomDoor["wall"] {
  return v === "north" || v === "south" || v === "east" || v === "west";
}

function normalizePoint(v: unknown): WallPoint | null {
  const rec = asRecord(v);
  if (!rec) return null;
  const x = toFiniteNumber(rec.x);
  const z = toFiniteNumber(rec.z);
  if (x === null || z === null) return null;
  return { x, z };
}

function isWallPoint(v: WallPoint | null): v is WallPoint {
  return Boolean(v);
}

function normalizeDoor(v: unknown): RoomDoor | null {
  const rec = asRecord(v);
  if (!rec) return null;
  if (!isWallDirection(rec.wall)) return null;
  const position = toFiniteNumber(rec.position);
  const width = toFiniteNumber(rec.width);
  if (position === null || width === null) return null;
  return { wall: rec.wall, position, width };
}

function normalizeWindow(v: unknown): RoomWindow | null {
  const rec = asRecord(v);
  if (!rec) return null;
  if (!isWallDirection(rec.wall)) return null;
  const position = toFiniteNumber(rec.position);
  const width = toFiniteNumber(rec.width);
  if (position === null || width === null) return null;
  const height = toFiniteNumber(rec.height);
  const sillHeight = toFiniteNumber(rec.sillHeight);
  return {
    wall: rec.wall,
    position,
    width,
    height: height ?? 1.2,
    sillHeight: sillHeight ?? 0.9,
  };
}

function getDefaultWallColor(roomName: string): string {
  const name = roomName.toLowerCase();
  if (name.includes("living") || name.includes("lounge")) return "#E8E0D4";
  if (name.includes("bedroom") || name.includes("bed")) return "#E4E2EE";
  if (name.includes("kitchen")) return "#ECEAE5";
  if (name.includes("bath") || name.includes("toilet") || name.includes("wc"))
    return "#E2EBEA";
  if (
    name.includes("hall") ||
    name.includes("corridor") ||
    name.includes("entry")
  )
    return "#E6E4DE";
  if (name.includes("dining")) return "#EAE4D8";
  if (name.includes("study") || name.includes("office")) return "#E4E8EE";
  return "#EAE8E4";
}

function getDefaultFloorMaterial(
  roomName: string,
): SceneRoom["floor_material"] {
  const name = roomName.toLowerCase();
  if (
    name.includes("bath") ||
    name.includes("toilet") ||
    name.includes("wc") ||
    name.includes("kitchen") ||
    name.includes("hall") ||
    name.includes("entry") ||
    name.includes("laundry") ||
    name.includes("utility")
  ) {
    return "tile";
  }
  return "hardwood";
}

function stripJsonFences(raw: string): string {
  const s = raw.trim();
  if (s.startsWith("```")) {
    const first = s.indexOf("\n");
    const last = s.lastIndexOf("```");
    if (first >= 0 && last > first) return s.slice(first + 1, last).trim();
  }
  // Also strip any leading/trailing non-JSON characters
  const start = s.indexOf("{");
  const end = s.lastIndexOf("}");
  if (start >= 0 && end > start) return s.slice(start, end + 1);
  return s;
}

function guessMimeType(url: string): string {
  const lower = url.toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".webp")) return "image/webp";
  return "image/png";
}

function normalizeRoom(room: Partial<SceneRoom>, idx: number): SceneRoom {
  return {
    id:
      typeof room.id === "string" && room.id.trim()
        ? room.id
        : `room_${idx + 1}`,
    name:
      typeof room.name === "string" && room.name.trim()
        ? room.name
        : WORKSPACE.roomLabels.fallback,
    shape: Array.isArray(room.shape)
      ? room.shape.map(normalizePoint).filter(isWallPoint)
      : [],
    height: isFiniteNumber(room.height) ? room.height : 2.7,
    floor_material: [
      "hardwood",
      "tile",
      "carpet",
      "concrete",
      "marble",
    ].includes(room.floor_material as string)
      ? (room.floor_material as SceneRoom["floor_material"])
      : "hardwood",
    wall_color:
      typeof room.wall_color === "string" && room.wall_color.trim()
        ? room.wall_color
        : "#F5F0E8",
    doors: Array.isArray(room.doors)
      ? room.doors.map(normalizeDoor).filter((d): d is RoomDoor => Boolean(d))
      : [],
    windows: Array.isArray(room.windows)
      ? room.windows
          .map(normalizeWindow)
          .filter((w): w is RoomWindow => Boolean(w))
      : [],
  };
}

function boundsFromPoints(points: WallPoint[]) {
  let minX = Infinity,
    maxX = -Infinity,
    minZ = Infinity,
    maxZ = -Infinity;
  for (const p of points) {
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x);
    minZ = Math.min(minZ, p.z);
    maxZ = Math.max(maxZ, p.z);
  }
  if (!isFinite(minX)) {
    minX = 0;
    maxX = 0;
    minZ = 0;
    maxZ = 0;
  }
  return { minX, maxX, minZ, maxZ, width: maxX - minX, depth: maxZ - minZ };
}

function rectShapeFromBounds(b: {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}): WallPoint[] {
  return [
    { x: b.minX, z: b.minZ },
    { x: b.maxX, z: b.minZ },
    { x: b.maxX, z: b.maxZ },
    { x: b.minX, z: b.maxZ },
  ];
}

function clampOpenings(room: SceneRoom): SceneRoom {
  const b = boundsFromPoints(room.shape);
  const width = Math.max(0.1, b.width);
  const depth = Math.max(0.1, b.depth);

  const clampDoor = (d: RoomDoor): RoomDoor => {
    const wallLen = d.wall === "north" || d.wall === "south" ? width : depth;
    const safeWidth = clamp(d.width, 0.6, Math.min(2.0, wallLen));
    const minPos = safeWidth / 2;
    const maxPos = Math.max(minPos, wallLen - safeWidth / 2);
    return {
      ...d,
      width: safeWidth,
      position: clamp(d.position, minPos, maxPos),
    };
  };

  const clampWindow = (w: RoomWindow): RoomWindow => {
    const wallLen = w.wall === "north" || w.wall === "south" ? width : depth;
    const safeWidth = clamp(w.width, 0.5, Math.min(3.0, wallLen));
    const minPos = safeWidth / 2;
    const maxPos = Math.max(minPos, wallLen - safeWidth / 2);
    const safeHeight = clamp(w.height, 0.6, 2.2);
    const safeSill = clamp(
      w.sillHeight,
      0.2,
      Math.max(0.2, room.height - safeHeight - 0.1),
    );
    return {
      ...w,
      width: safeWidth,
      position: clamp(w.position, minPos, maxPos),
      height: safeHeight,
      sillHeight: safeSill,
    };
  };

  return {
    ...room,
    doors: room.doors.map(clampDoor),
    windows: room.windows.map(clampWindow),
  };
}

function validateAndFixRooms(rooms: SceneRoom[]): SceneRoom[] {
  let globalMinX = Infinity,
    globalMinZ = Infinity;
  for (const r of rooms) {
    for (const p of r.shape) {
      globalMinX = Math.min(globalMinX, p.x);
      globalMinZ = Math.min(globalMinZ, p.z);
    }
  }
  const offX = isFinite(globalMinX) && globalMinX < 0 ? -globalMinX : 0;
  const offZ = isFinite(globalMinZ) && globalMinZ < 0 ? -globalMinZ : 0;

  return rooms
    .map((room) => {
      const shifted = room.shape.map((p) => ({ x: p.x + offX, z: p.z + offZ }));
      const b = boundsFromPoints(shifted);
      return clampOpenings({ ...room, shape: rectShapeFromBounds(b) });
    })
    .filter((r) => r.shape.length === 4);
}

function withTimeout(ms: number) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), ms);
  return { signal: controller.signal, cancel: () => clearTimeout(id) };
}

// ── Extraction via OpenAI ─────────────────────────────────────────────────────

async function extractWithOpenAI(
  b64: string,
  mimeType: string,
  signal: AbortSignal,
): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OpenAI API key not configured");

  const openai = new OpenAI({ apiKey });
  const completion = await openai.chat.completions.create(
    {
      model: "gpt-4o",
      max_tokens: 4096,
      messages: [
        { role: "system", content: EXTRACTION_SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: { url: `data:${mimeType};base64,${b64}` },
            },
            {
              type: "text",
              text: "Analyse this floor plan carefully. Count every room. Measure proportions. Return the complete JSON geometry.",
            },
          ],
        },
      ],
    },
    { signal },
  );
  const content = completion.choices[0]?.message?.content ?? null;
  if (!content) throw new Error("OpenAI returned empty response");
  return content;
}

// ── Extraction via Gemini ─────────────────────────────────────────────────────

// ── Extraction via Gemini — dual image ────────────────────────────────────────

async function extractWithGemini(
  floorplanB64: string,
  floorplanMime: string,
  signal: AbortSignal,
  renderB64?: string,
  renderMime?: string,
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Gemini API key not configured");

  const { GoogleGenAI } = await import("@google/genai");
  const ai = new GoogleGenAI({ apiKey });
  const model = process.env.GEMINI_EXTRACTION_MODEL ?? "gemini-2.0-flash";

  console.log(
    "[extract:gemini] model:",
    model,
    "| has render:",
    Boolean(renderB64),
  );

  const timeoutPromise = new Promise<never>((_, reject) => {
    signal.addEventListener("abort", () =>
      reject(new Error("Gemini timed out")),
    );
  });

  const parts: Array<{
    text?: string;
    inlineData?: { mimeType: string; data: string };
  }> = [];

  // Image 1: floor plan — geometry source
  parts.push({
    inlineData: {
      mimeType: floorplanMime as "image/png" | "image/jpeg" | "image/webp",
      data: floorplanB64,
    },
  });

  // Image 2: 3D render — material/color source only
  if (renderB64 && renderMime) {
    parts.push({
      inlineData: {
        mimeType: renderMime as "image/png" | "image/jpeg" | "image/webp",
        data: renderB64,
      },
    });
  }

  const contextInstruction = renderB64
    ? `You have TWO images:

IMAGE 1 (2D Floor Plan — GEOMETRY SOURCE):
Use this as the SOLE source for ALL of the following:
- Every room shape, size, and position
- Exact wall lengths and positions  
- Door: which wall it is on, exact position from wall corner, and width
- Window: which wall, position, size
- Room names (read labels directly from the floor plan)
- Overall building dimensions and proportions

IMAGE 2 (3D Render — STYLE SOURCE ONLY):
Use this ONLY for:
- floor_material per room (observe the actual floor texture rendered)
- wall_color per room (observe the actual wall color rendered)
- Do NOT use this image for any geometry, door placement, or window placement

STRICT RULE: Every door.position and door.wall value MUST be read from IMAGE 1 only.
STRICT RULE: Every window.position and window.wall value MUST be read from IMAGE 1 only.`
    : `You have ONE image: a 2D floor plan. Extract all geometry from it.`;

  parts.push({
    text:
      EXTRACTION_SYSTEM_PROMPT +
      "\n\n" +
      contextInstruction +
      "\n\nAnalyse carefully. Return ONLY the complete JSON object, nothing else.",
  });

  const response = await Promise.race([
    ai.models.generateContent({
      model,
      contents: [{ role: "user", parts }],
      config: {
        temperature: 0.1,
        responseMimeType: "application/json",
      },
    }),
    timeoutPromise,
  ]);

  console.log(
    "[extract:gemini] finishReason:",
    response.candidates?.[0]?.finishReason,
  );
  console.log(
    "[extract:gemini] usage:",
    JSON.stringify(response.usageMetadata),
  );

  if (response.candidates?.[0]?.finishReason === "MAX_TOKENS") {
    throw new Error("Gemini response truncated");
  }

  const text = response.candidates?.[0]?.content?.parts?.[0]?.text ?? null;
  console.log("[extract:gemini] response length:", text?.length ?? 0);
  if (!text) throw new Error("Gemini returned empty response");
  return text;
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: auth } = await supabase.auth.getUser();
    const userId = auth.user?.id ?? null;

    const body = (await request.json()) as Partial<Body>;
    if (!body.project_id) {
      return NextResponse.json(
        { error: WORKSPACE.errorBuilding },
        { status: 400 },
      );
    }

    const admin = createSupabaseAdmin();
    const { data: project, error: projectError } = await admin
      .from("projects")
      .select("*")
      .eq("id", body.project_id)
      .single();

    const p = (project ?? null) as ProjectRow | null;
    if (projectError || !p) {
      return NextResponse.json(
        { error: WORKSPACE.errorBuilding },
        { status: 404 },
      );
    }
    if (userId && p.user_id !== userId) {
      return NextResponse.json(
        { error: WORKSPACE.errorBuilding },
        { status: 404 },
      );
    }

    // Return cached scene JSON if already extracted
    if (p.scene_json && p.workspace_enabled) {
      return NextResponse.json({ scene_json: p.scene_json });
    }

    const floorplanUrl = p.floorplan_url;
    if (!floorplanUrl) {
      return NextResponse.json(
        { error: WORKSPACE.errorNoFloorplan },
        { status: 400 },
      );
    }

    // Download floor plan image
    const imgRes = await fetch(floorplanUrl, { method: "GET" });
    if (!imgRes.ok) {
      return NextResponse.json(
        { error: WORKSPACE.errorExtraction },
        { status: 422 },
      );
    }
    const bytes = new Uint8Array(await imgRes.arrayBuffer());
    const b64 = Buffer.from(bytes).toString("base64");
    const mimeType = guessMimeType(floorplanUrl);

    // Choose provider: WORKSPACE_EXTRACTION_PROVIDER=gemini or openai (default)
    const extractionProvider =
      process.env.WORKSPACE_EXTRACTION_PROVIDER ?? "openai";
    console.log(`[extract] using provider: ${extractionProvider}`);

    const { signal, cancel } = withTimeout(60_000);
    let rawContent: string;
    try {
      if (extractionProvider === "gemini") {
        rawContent = await extractWithGemini(b64, mimeType, signal);
        console.log("[extract] Gemini raw response length:", rawContent.length);
      } else {
        rawContent = await extractWithOpenAI(b64, mimeType, signal);
        console.log("[extract] OpenAI raw response length:", rawContent.length);
      }
    } catch (e) {
      console.error(`[extract] ${extractionProvider} extraction error:`, e);
      if (signal.aborted) {
        return NextResponse.json(
          { error: WORKSPACE.errorExtraction },
          { status: 504 },
        );
      }
      return NextResponse.json(
        { error: WORKSPACE.errorExtraction },
        { status: 422 },
      );
    } finally {
      cancel();
    }

    // Parse JSON
    const rawJson = stripJsonFences(rawContent);
    console.log("[extract] stripped JSON preview:", rawJson.slice(0, 200));

    let parsed: unknown;
    try {
      parsed = JSON.parse(rawJson);
    } catch (e) {
      console.error(
        "[extract] JSON parse failed:",
        e,
        "\nRaw:",
        rawJson.slice(0, 500),
      );
      return NextResponse.json(
        { error: WORKSPACE.errorExtraction },
        { status: 422 },
      );
    }

    const rec = parsed as Record<string, unknown>;
    const roomsRaw = rec.rooms;
    if (!Array.isArray(roomsRaw) || roomsRaw.length < 1) {
      console.error("[extract] no rooms array found in parsed JSON");
      return NextResponse.json(
        { error: WORKSPACE.errorExtraction },
        { status: 422 },
      );
    }

    console.log(`[extract] raw room count: ${roomsRaw.length}`);

    const rooms = roomsRaw
      .map((r, idx) => normalizeRoom(r as Partial<SceneRoom>, idx))
      .map((room) => ({
        ...room,
        wall_color:
          room.wall_color !== "#F5F0E8"
            ? room.wall_color
            : getDefaultWallColor(room.name),
        floor_material:
          room.floor_material === "hardwood" &&
          getDefaultFloorMaterial(room.name) === "tile"
            ? ("tile" as const)
            : room.floor_material,
      }));

    const fixedRooms = validateAndFixRooms(rooms);
    console.log(`[extract] fixed room count: ${fixedRooms.length}`);
    fixedRooms.forEach((r, i) => {
      const b = boundsFromPoints(r.shape);
      console.log(
        `[extract] room[${i}] "${r.name}" x:${b.minX}–${b.maxX} z:${b.minZ}–${b.maxZ} doors:${r.doors.length} windows:${r.windows.length}`,
      );
    });

    if (fixedRooms.length < 1 || fixedRooms.some((r) => r.shape.length !== 4)) {
      console.error("[extract] validation failed — invalid room shapes");
      return NextResponse.json(
        { error: WORKSPACE.errorExtraction },
        { status: 422 },
      );
    }

    const sceneJson: SceneJSON = {
      rooms: fixedRooms,
      furniture: [],
      extracted_at: new Date().toISOString(),
      floorplan_url: floorplanUrl,
    };

    // Persist if authenticated
    const { error: updateError } = await admin
      .from("projects")
      .update({
        scene_json: sceneJson as unknown as Json,
        workspace_enabled: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", body.project_id);

    if (updateError) {
      console.error("[extract] DB update error:", updateError);
      return NextResponse.json(
        { error: WORKSPACE.errorBuilding },
        { status: 500 },
      );
    }

    return NextResponse.json({ scene_json: sceneJson });
  } catch (e) {
    console.error("[extract] unhandled error:", e);
    return NextResponse.json(
      { error: WORKSPACE.errorBuilding },
      { status: 500 },
    );
  }
}
