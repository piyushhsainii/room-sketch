import OpenAI from "openai";

import { ERRORS } from "@/constants/content";
import { errorMessage } from "@/lib/errorMessage";

// ── OpenAI system prompt (unchanged — works well for OpenAI) ─────────────────
const SYSTEM_PROMPT =
  "You are given a floor plan image. Create a top-down 3D plan render that preserves the exact layout. " +
  "Camera/view: keep the same top-down viewpoint as the floor plan (no rotation, no perspective tilt). " +
  "Layout fidelity: strictly keep walls/doors/windows/room boundaries in the same positions and proportions. Do not add/remove rooms. " +
  "Guard lines: trace the exact floor plan wall lines as crisp guard lines (thin dark outlines). Use the input linework as the immutable guide, and keep these outlines visible on top of the 3D elements. " +
  "3D treatment: add realistic 3D elements inside the rooms (furniture, fixtures, cabinetry, rugs) with modern materials and lighting, while keeping the plan view. " +
  "Annotations: add clear room labels directly on the render (inside each room). Use short names like 'Living', 'Kitchen', 'Bath', 'Bedroom', 'Office', 'Hall', 'Closet'. " +
  "Typography: labels must be legible, high-contrast, simple sans, and never overlap walls or furniture.";

// ── Ideogram-specific prompt (different model, different prompt engineering) ──
// Ideogram V2/V3 responds better to descriptive scene prompts than instruction prompts.
// It needs photorealism keywords, material descriptors, and lighting direction.
// Keep it under 500 tokens for best results.
// ── Ideogram-specific prompt ──────────────────────────────────────────────────

const IDEOGRAM_BASE_PROMPT =
  "Top-down photorealistic 3D architectural interior render. " +
  "CRITICAL: The reference image is a floor plan. You MUST preserve its EXACT layout — " +
  "every room shape, wall position, diagonal walls, room sizes and proportions, " +
  "door openings, and spatial relationships must match the reference precisely. " +
  "Do not add, remove, or resize any rooms. Do not change wall angles. " +
  "The diagonal wall in the reference must remain diagonal at the same angle. " +
  "Convert this exact floor plan layout into a photorealistic 3D bird's eye render: " +
  "realistic hardwood and tile floors with material texture, " +
  "thick 3D walls with depth and shadow, " +
  "appropriately scaled furniture per room type — kitchen counters and appliances in kitchen, " +
  "toilet and bathtub in bathroom, sofa and coffee table in living room, bed in bedroom, " +
  "soft warm interior lighting with window light casting shadows, " +
  "high quality PBR materials on all surfaces. " +
  "Photorealistic architectural visualization. No text. No labels. No dimensions.";

const IDEOGRAM_NEGATIVE_PROMPT =
  "2D floor plan, blueprint, line drawing, black and white schematic, " +
  "technical drawing, CAD, flat illustration, sketch, wireframe, " +
  "dashed lines, dimension annotations, measurements, text labels, " +
  "changed layout, wrong room count, missing rooms, added rooms, " +
  "moved walls, different proportions, cartoon, painterly, low quality";

const IDEOGRAM_EDIT_BASE_PROMPT =
  "Photorealistic top-down 3D architectural interior render from directly overhead. " +
  "Maintain exact room layout, spatial proportions, and photorealistic 3D quality. " +
  "Apply requested style changes while preserving architectural accuracy and realistic materials.";
// ── Prompt builders ───────────────────────────────────────────────────────────

function buildPrompt(styleContext?: string): string {
  const style = (styleContext ?? "").trim();
  if (!style) return SYSTEM_PROMPT;
  return (
    SYSTEM_PROMPT +
    "\n\n" +
    "Style & context (follow while preserving layout fidelity): " +
    style
  );
}

function buildIdeogramPrompt(styleContext?: string): string {
  const style = (styleContext ?? "").trim();
  if (!style) return IDEOGRAM_BASE_PROMPT;
  // For Ideogram: weave style into the scene description naturally
  return (
    IDEOGRAM_BASE_PROMPT +
    " Interior design style: " +
    style +
    ". Maintain photorealistic quality and exact floor plan layout."
  );
}

function buildEditPrompt(editPrompt: string, styleContext?: string): string {
  const base =
    "You are editing an existing top-down 3D plan render. " +
    "Preserve the exact layout, walls, doors, windows, and room boundaries. " +
    "Keep the top-down camera. Keep room labels legible. " +
    "Apply the requested change without introducing new rooms or changing geometry.";

  const style = (styleContext ?? "").trim();
  const user = editPrompt.trim();

  if (!style) return `${base}\n\nChange request: ${user}`;
  return `${base}\n\nStyle context: ${style}\n\nChange request: ${user}`;
}

function buildIdeogramEditPrompt(
  editPrompt: string,
  styleContext?: string,
): string {
  const style = (styleContext ?? "").trim();
  const user = editPrompt.trim();
  const base = IDEOGRAM_EDIT_BASE_PROMPT + " Edit instruction: " + user + ".";
  if (!style) return base;
  return base + " Style context: " + style + ".";
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function downloadAsFile(
  url: string,
  filename: string,
  signal: AbortSignal,
): Promise<{ file: File; contentType: string }> {
  const res = await fetch(url, { method: "GET", signal });
  if (!res.ok) throw new Error(ERRORS.imageGenFailed);
  const contentType =
    res.headers.get("content-type") ?? "application/octet-stream";
  const bytes = new Uint8Array(await res.arrayBuffer());
  const file = new File([bytes], filename, { type: contentType });
  return { file, contentType };
}

async function downloadBytes(
  url: string,
  signal?: AbortSignal,
): Promise<{ bytes: Uint8Array; contentType: string }> {
  const res = await fetch(url, { method: "GET", signal });
  if (!res.ok) throw new Error(ERRORS.imageGenFailed);
  const contentType =
    res.headers.get("content-type") ?? "application/octet-stream";
  const bytes = new Uint8Array(await res.arrayBuffer());
  return { bytes, contentType };
}

function withTimeout(ms: number) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), ms);
  return { controller, cancel: () => clearTimeout(id) };
}

// ── editRender ────────────────────────────────────────────────────────────────

export async function editRender(
  baseImageUrl: string,
  editPrompt: string,
  styleContext?: string,
): Promise<string> {
  const provider = process.env.IMAGE_MODEL_PROVIDER ?? "openai";

  // ─── OPENAI ───────────────────────────────────────────────────────────────
  if (provider === "openai") {
    const prompt = buildEditPrompt(editPrompt, styleContext);
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error(ERRORS.providerMisconfigured);

    const openai = new OpenAI({ apiKey });
    const imageModel = process.env.OPENAI_IMAGE_MODEL ?? "gpt-image-1";

    const { controller, cancel } = withTimeout(150_000);
    try {
      const { file } = await downloadAsFile(
        baseImageUrl,
        "render.png",
        controller.signal,
      );
      const result = await openai.images.edit(
        {
          model: imageModel,
          image: file,
          prompt,
          size: "1536x1024",
          quality: "high",
          output_format: "png",
          background: "opaque",
        },
        { signal: controller.signal },
      );
      const b64 = result.data?.[0]?.b64_json ?? null;
      if (!b64) throw new Error(ERRORS.imageGenFailed);
      return `data:image/png;base64,${b64}`;
    } catch (e) {
      throw new Error(errorMessage(e) || ERRORS.imageGenFailed);
    } finally {
      cancel();
    }
  }

  // ─── NANOBANANA ───────────────────────────────────────────────────────────
  if (provider === "nanobanana") {
    const apiKey = process.env.NANO_BANANA_API_KEY;
    if (!apiKey) throw new Error(ERRORS.providerMisconfigured);

    const { GoogleGenAI } = await import("@google/genai");
    const ai = new GoogleGenAI({ apiKey });

    const prompt = buildEditPrompt(editPrompt, styleContext);
    const model =
      process.env.NANO_BANANA_MODEL ??
      "gemini-2.0-flash-preview-image-generation";

    const { controller, cancel } = withTimeout(120_000);
    try {
      const { bytes, contentType } = await downloadBytes(
        baseImageUrl,
        controller.signal,
      );
      const base64Image = Buffer.from(bytes).toString("base64");
      const mimeType = (contentType ?? "image/png") as
        | "image/png"
        | "image/jpeg"
        | "image/webp";

      const contents = [
        { text: prompt },
        {
          inlineData: {
            mimeType,
            data: base64Image,
          },
        },
      ];

      const response = await ai.models.generateContent({
        model,
        contents,
        config: {
          responseModalities: ["Text", "Image"],
        },
      });

      const parts = response.candidates?.[0]?.content?.parts ?? [];
      for (const part of parts) {
        if (part.inlineData?.data) {
          const mime = part.inlineData.mimeType ?? "image/png";
          return `data:${mime};base64,${part.inlineData.data}`;
        }
      }

      throw new Error(ERRORS.imageGenFailed);
    } catch (e) {
      throw new Error(errorMessage(e) || ERRORS.imageGenFailed);
    } finally {
      cancel();
    }
  }

  // ─── IDEOGRAM (editRender) ────────────────────────────────────────────────
  if (provider === "ideogram") {
    const prompt = buildIdeogramEditPrompt(editPrompt, styleContext);
    const apiKey = process.env.IDEOGRAM_API_KEY;
    if (!apiKey) throw new Error(ERRORS.providerMisconfigured);

    // Higher weight for edits: preserve the existing render, apply targeted change
    const imageWeight = parseInt(
      process.env.IDEOGRAM_EDIT_IMAGE_WEIGHT ?? "65",
      10,
    );
    const renderingSpeed = process.env.IDEOGRAM_RENDERING_SPEED ?? "DEFAULT";

    const { controller, cancel } = withTimeout(120_000);
    try {
      const { bytes, contentType } = await downloadBytes(
        baseImageUrl,
        controller.signal,
      );

      const formData = new FormData();
      formData.append("prompt", prompt);
      formData.append("style_type", "REALISTIC");
      formData.append("rendering_speed", renderingSpeed);
      formData.append("image_weight", String(imageWeight));
      formData.append("magic_prompt_option", "OFF");
      formData.append("negative_prompt", IDEOGRAM_NEGATIVE_PROMPT);
      formData.append("aspect_ratio", "4x3");

      const imageBlob = new Blob([bytes], { type: contentType ?? "image/png" });
      formData.append("image", imageBlob, "render.png");

      const res = await fetch("https://api.ideogram.ai/v1/ideogram-v3/remix", {
        method: "POST",
        headers: { "Api-Key": apiKey },
        body: formData,
        signal: controller.signal,
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Ideogram edit failed: ${res.status} ${errText}`);
      }

      const json = (await res.json()) as {
        data?: Array<{ url?: string }>;
      };

      const resultUrl = json.data?.[0]?.url ?? null;
      if (!resultUrl) throw new Error(ERRORS.imageGenFailed);
      return resultUrl;
    } catch (e) {
      throw new Error(errorMessage(e) || ERRORS.imageGenFailed);
    } finally {
      cancel();
    }
  }

  throw new Error(ERRORS.providerMisconfigured);
}

// ── generateRender ────────────────────────────────────────────────────────────

export async function generateRender(
  floorplanUrl: string,
  styleContext?: string,
): Promise<string> {
  const provider = process.env.IMAGE_MODEL_PROVIDER ?? "openai";

  // ─── OPENAI ───────────────────────────────────────────────────────────────
  if (provider === "openai") {
    const prompt = buildPrompt(styleContext);
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error(ERRORS.providerMisconfigured);

    const openai = new OpenAI({ apiKey });
    const imageModel = process.env.OPENAI_IMAGE_MODEL ?? "gpt-image-1";

    const { controller, cancel } = withTimeout(150_000);
    try {
      const { file, contentType } = await downloadAsFile(
        floorplanUrl,
        "floorplan",
        controller.signal,
      );

      const result = contentType.startsWith("image/")
        ? await openai.images.edit(
            {
              model: imageModel,
              image: file,
              prompt,
              size: "1536x1024",
              quality: "high",
              output_format: "png",
              background: "opaque",
            },
            { signal: controller.signal },
          )
        : await openai.images.generate(
            {
              model: imageModel,
              prompt: `${prompt}\n\nFloor plan reference URL: ${floorplanUrl}`,
              size: "1536x1024",
              quality: "high",
              output_format: "png",
              background: "opaque",
            },
            { signal: controller.signal },
          );

      const b64 = result.data?.[0]?.b64_json ?? null;
      if (!b64) throw new Error(ERRORS.imageGenFailed);
      return `data:image/png;base64,${b64}`;
    } catch (e) {
      throw new Error(errorMessage(e) || ERRORS.imageGenFailed);
    } finally {
      cancel();
    }
  }

  // ─── NANOBANANA ───────────────────────────────────────────────────────────
  if (provider === "nanobanana") {
    const apiKey = process.env.NANO_BANANA_API_KEY;

    // ── Debug logs ────────────────────────────────────────────────────────
    console.log("[nanobanana] provider triggered");
    console.log("[nanobanana] apiKey present:", Boolean(apiKey));
    console.log("[nanobanana] apiKey length:", apiKey?.length ?? 0);
    console.log(
      "[nanobanana] model:",
      process.env.NANO_BANANA_MODEL ??
        "gemini-2.0-flash-preview-image-generation",
    );

    if (!apiKey) {
      console.error(
        "[nanobanana] ERROR: NANO_BANANA_API_KEY is missing or empty",
      );
      throw new Error(ERRORS.providerMisconfigured);
    }

    let GoogleGenAI: typeof import("@google/genai").GoogleGenAI;
    try {
      const mod = await import("@google/genai");
      GoogleGenAI = mod.GoogleGenAI;
      console.log("[nanobanana] @google/genai imported successfully");
    } catch (importErr) {
      console.error(
        "[nanobanana] ERROR: Failed to import @google/genai:",
        importErr,
      );
      throw new Error(ERRORS.providerMisconfigured);
    }

    const ai = new GoogleGenAI({ apiKey });
    const prompt = buildPrompt(styleContext); // use buildEditPrompt in editRender
    const model =
      process.env.NANO_BANANA_MODEL ??
      "gemini-2.0-flash-preview-image-generation";

    console.log("[nanobanana] prompt length:", prompt.length);
    console.log("[nanobanana] floorplan url:", floorplanUrl); // baseImageUrl in editRender

    const { controller, cancel } = withTimeout(120_000);
    try {
      console.log("[nanobanana] downloading image...");
      const { bytes, contentType } = await downloadBytes(
        floorplanUrl,
        controller.signal,
      );
      console.log(
        "[nanobanana] image downloaded, bytes:",
        bytes.length,
        "contentType:",
        contentType,
      );

      const base64Image = Buffer.from(bytes).toString("base64");
      const mimeType = (contentType ?? "image/png") as
        | "image/png"
        | "image/jpeg"
        | "image/webp";

      console.log(
        "[nanobanana] calling ai.models.generateContent, model:",
        model,
      );
      const response = await ai.models.generateContent({
        model,
        contents: [
          { text: prompt },
          { inlineData: { mimeType, data: base64Image } },
        ],
        config: {
          responseModalities: ["Text", "Image"],
        },
      });

      console.log("[nanobanana] response received");
      console.log(
        "[nanobanana] candidates count:",
        response.candidates?.length ?? 0,
      );

      const parts = response.candidates?.[0]?.content?.parts ?? [];
      console.log("[nanobanana] parts count:", parts.length);
      parts.forEach((p, i) => {
        console.log(`[nanobanana] part[${i}] keys:`, Object.keys(p));
        if (p.text)
          console.log(`[nanobanana] part[${i}] text:`, p.text.slice(0, 100));
        if (p.inlineData)
          console.log(
            `[nanobanana] part[${i}] inlineData mimeType:`,
            p.inlineData.mimeType,
            "data length:",
            p.inlineData.data?.length ?? 0,
          );
      });

      for (const part of parts) {
        if (part.inlineData?.data) {
          const mime = part.inlineData.mimeType ?? "image/png";
          console.log("[nanobanana] SUCCESS returning image, mime:", mime);
          return `data:${mime};base64,${part.inlineData.data}`;
        }
      }

      console.error("[nanobanana] ERROR: no inlineData found in any part");
      throw new Error(ERRORS.imageGenFailed);
    } catch (e) {
      console.error("[nanobanana] CAUGHT ERROR:", e);
      throw new Error(errorMessage(e) || ERRORS.imageGenFailed);
    } finally {
      cancel();
    }
  }

  // ─── IDEOGRAM ─────────────────────────────────────────────────────────────
  // ─── IDEOGRAM ─────────────────────────────────────────────────────────────
  if (provider === "ideogram") {
    const prompt = buildIdeogramPrompt(styleContext);
    const apiKey = process.env.IDEOGRAM_API_KEY;
    if (!apiKey) throw new Error(ERRORS.providerMisconfigured);

    // V3 Remix: send floor plan as `image`, use LOW image_weight so Ideogram
    // treats it as spatial layout reference only — not style reference.
    // At 35-40 weight it reads room positions but generates full 3D render.
    const imageWeight = parseInt(process.env.IDEOGRAM_IMAGE_WEIGHT ?? "40", 10);
    const renderingSpeed = process.env.IDEOGRAM_RENDERING_SPEED ?? "DEFAULT";
    const numImages = parseInt(process.env.IDEOGRAM_NUM_IMAGES ?? "2", 10);

    const { controller, cancel } = withTimeout(120_000);
    try {
      let imageBytes: Uint8Array | null = null;
      let imageMimeType = "image/png";

      try {
        const { bytes, contentType } = await downloadBytes(
          floorplanUrl,
          controller.signal,
        );
        if ((contentType ?? "").startsWith("image/")) {
          imageBytes = bytes;
          imageMimeType = contentType;
        }
      } catch {
        imageBytes = null;
      }

      let resultUrl: string | null = null;

      if (imageBytes) {
        // ── V3 Remix: floor plan → 3D render ──────────────────────────────
        const formData = new FormData();
        formData.append("prompt", prompt);
        // style_type REALISTIC = photorealistic output
        // Valid V3 values: AUTO, GENERAL, REALISTIC, DESIGN, FICTION
        formData.append("style_type", "REALISTIC");
        formData.append("rendering_speed", renderingSpeed);
        // Low weight: use floor plan for spatial layout only, not style
        formData.append("image_weight", String(imageWeight));
        formData.append("magic_prompt_option", "OFF");
        formData.append("num_images", String(numImages));
        formData.append("negative_prompt", IDEOGRAM_NEGATIVE_PROMPT);
        // aspect_ratio: 4:3 works well for floor plans (wider than tall)
        formData.append("aspect_ratio", "4x3");

        const imageBlob = new Blob([imageBytes], { type: imageMimeType });
        formData.append("image", imageBlob, "floorplan.png");

        const res = await fetch(
          "https://api.ideogram.ai/v1/ideogram-v3/remix",
          {
            method: "POST",
            headers: { "Api-Key": apiKey },
            body: formData,
            signal: controller.signal,
          },
        );

        if (!res.ok) {
          const errText = await res.text();
          throw new Error(`Ideogram remix failed: ${res.status} ${errText}`);
        }

        const json = (await res.json()) as {
          data?: Array<{ url?: string }>;
        };

        // Return first image URL — multi-image support requires pipeline change
        resultUrl = json.data?.[0]?.url ?? null;
      } else {
        // ── V3 Generate fallback: no image available ───────────────────────
        const formData = new FormData();
        formData.append(
          "prompt",
          prompt +
            " Floor plan layout: standard residential with living room, kitchen, bedroom, bathroom.",
        );
        formData.append("style_type", "REALISTIC");
        formData.append("rendering_speed", renderingSpeed);
        formData.append("magic_prompt_option", "OFF");
        formData.append("num_images", String(numImages));
        formData.append("negative_prompt", IDEOGRAM_NEGATIVE_PROMPT);
        formData.append("aspect_ratio", "4x3");

        const res = await fetch(
          "https://api.ideogram.ai/v1/ideogram-v3/generate",
          {
            method: "POST",
            headers: { "Api-Key": apiKey },
            body: formData,
            signal: controller.signal,
          },
        );

        if (!res.ok) {
          const errText = await res.text();
          throw new Error(`Ideogram generate failed: ${res.status} ${errText}`);
        }

        const json = (await res.json()) as {
          data?: Array<{ url?: string }>;
        };
        resultUrl = json.data?.[0]?.url ?? null;
      }

      if (!resultUrl) throw new Error(ERRORS.imageGenFailed);
      return resultUrl;
    } catch (e) {
      throw new Error(errorMessage(e) || ERRORS.imageGenFailed);
    } finally {
      cancel();
    }
  }

  throw new Error(ERRORS.providerMisconfigured);
}
