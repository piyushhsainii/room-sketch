import OpenAI from "openai";
import sharp from "sharp";

import { ERRORS } from "@/constants/content";
import { errorMessage } from "@/lib/errorMessage";
import { VIDEO_PROMPT } from "./VIDEO_PROMPT";

function withTimeout(ms: number) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), ms);
  return { controller, cancel: () => clearTimeout(id) };
}

async function downloadReferenceFile(
  url: string,
  signal: AbortSignal,
): Promise<{ contentType: string; bytes: Uint8Array }> {
  const res = await fetch(url, { method: "GET", signal });
  if (!res.ok) throw new Error(ERRORS.videoGenFailed);

  const contentType =
    res.headers.get("content-type") ?? "application/octet-stream";
  const bytes = new Uint8Array(await res.arrayBuffer());

  return { contentType, bytes };
}

type ImageSize = { width: number; height: number };

type VideoCreateParams = Parameters<OpenAI["videos"]["create"]>[0];
type VideoSize = NonNullable<VideoCreateParams["size"]>;

function normalizeVideoSize(size: ImageSize | null): VideoSize {
  if (!size) return "1280x720";

  const w = size.width;
  const h = size.height;

  if (w === 1280 && h === 720) return "1280x720";
  if (w === 720 && h === 1280) return "720x1280";

  // sora-2 only supports these sizes.
  return w >= h ? "1280x720" : "720x1280";
}

async function prepareReferenceFile(
  bytes: Uint8Array,
  size: VideoSize,
): Promise<File> {
  const target = (() => {
    const [w, h] = size.split("x").map((n) => Number(n));
    return {
      width: Number.isFinite(w) ? w : 1792,
      height: Number.isFinite(h) ? h : 1024,
    };
  })();

  // Ensure the reference image exactly matches the video size.
  // Use "contain" to preserve the render and pad with white.
  const out = await sharp(Buffer.from(bytes))
    .resize({
      width: target.width,
      height: target.height,
      fit: "contain",
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    })
    .png()
    .toBuffer();

  return new File([new Uint8Array(out)], "reference.png", {
    type: "image/png",
  });
}

function readU32BE(bytes: Uint8Array, offset: number): number {
  return (
    (((bytes[offset] ?? 0) << 24) |
      ((bytes[offset + 1] ?? 0) << 16) |
      ((bytes[offset + 2] ?? 0) << 8) |
      (bytes[offset + 3] ?? 0)) >>>
    0
  );
}

function readU16BE(bytes: Uint8Array, offset: number): number {
  return (((bytes[offset] ?? 0) << 8) | (bytes[offset + 1] ?? 0)) >>> 0;
}

function readPngSize(bytes: Uint8Array): ImageSize | null {
  // PNG signature + IHDR chunk contains width/height at fixed offsets.
  if (bytes.length < 24) return null;
  const sig = [137, 80, 78, 71, 13, 10, 26, 10];
  for (let i = 0; i < sig.length; i += 1) {
    if (bytes[i] !== sig[i]) return null;
  }
  const width = readU32BE(bytes, 16);
  const height = readU32BE(bytes, 20);
  if (!width || !height) return null;
  return { width, height };
}

function readJpegSize(bytes: Uint8Array): ImageSize | null {
  // Parse JPEG segments to find SOF marker.
  if (bytes.length < 4) return null;
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;

  const isSofMarker = (m: number): boolean => {
    return (
      m === 0xc0 ||
      m === 0xc1 ||
      m === 0xc2 ||
      m === 0xc3 ||
      m === 0xc5 ||
      m === 0xc6 ||
      m === 0xc7 ||
      m === 0xc9 ||
      m === 0xca ||
      m === 0xcb ||
      m === 0xcd ||
      m === 0xce ||
      m === 0xcf
    );
  };

  let i = 2;
  while (i + 3 < bytes.length) {
    if (bytes[i] !== 0xff) {
      i += 1;
      continue;
    }

    // Skip fill bytes 0xFF.
    while (i < bytes.length && bytes[i] === 0xff) i += 1;
    const marker = bytes[i];
    if (marker == null) return null;
    i += 1;

    // Markers without length
    if (marker === 0xd9 || marker === 0xda) break;

    if (i + 1 >= bytes.length) return null;
    const segLen = readU16BE(bytes, i);
    if (segLen < 2) return null;

    if (isSofMarker(marker)) {
      // Segment data starts after length (2 bytes).
      const base = i + 2;
      if (base + 7 >= bytes.length) return null;
      const height = readU16BE(bytes, base + 1);
      const width = readU16BE(bytes, base + 3);
      if (!width || !height) return null;
      return { width, height };
    }

    i += segLen;
  }

  return null;
}

function readImageSize(
  bytes: Uint8Array,
  contentType: string,
): ImageSize | null {
  const ct = contentType.toLowerCase();
  if (ct.includes("png")) return readPngSize(bytes);
  if (ct.includes("jpeg") || ct.includes("jpg")) return readJpegSize(bytes);

  // Fallback: try PNG first, then JPEG.
  return readPngSize(bytes) ?? readJpegSize(bytes);
}

function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const id = setTimeout(() => resolve(), ms);
    signal.addEventListener(
      "abort",
      () => {
        clearTimeout(id);
        reject(new Error("aborted"));
      },
      { once: true },
    );
  });
}

async function generateVideoSora(renderImageUrl: string): Promise<Buffer> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error(ERRORS.providerMisconfigured);

  const { controller, cancel } = withTimeout(240_000);
  const signal = controller.signal;

  try {
    const openai = new OpenAI({ apiKey });
    const { bytes, contentType } = await downloadReferenceFile(
      renderImageUrl,
      signal,
    );
    const sizeMatch = readImageSize(bytes, contentType);
    const size = normalizeVideoSize(sizeMatch);
    const referenceFile = await prepareReferenceFile(bytes, size);

    const created = await openai.videos.create(
      {
        model: "sora-2",
        prompt: VIDEO_PROMPT,
        seconds: "12",
        size,
        input_reference: referenceFile,
      },
      { signal },
    );

    let job = created;
    const start = Date.now();

    while (job.status === "queued" || job.status === "in_progress") {
      if (Date.now() - start > 240_000) throw new Error("sora_timeout");
      await sleep(2000, signal);
      job = await openai.videos.retrieve(job.id, { signal });
    }

    if (job.status !== "completed") {
      const message = job.error?.message ?? ERRORS.videoGenFailed;
      throw new Error(message);
    }

    const content = await openai.videos.downloadContent(
      job.id,
      { variant: "video" },
      { signal },
    );
    if (!content.ok) {
      const text = await content.text().catch(() => "");
      throw new Error(
        `sora_download_failed_${content.status}${text ? `: ${text}` : ""}`,
      );
    }
    const videoBytes = new Uint8Array(await content.arrayBuffer());
    return Buffer.from(videoBytes);
  } catch (e) {
    throw new Error(errorMessage(e) || ERRORS.videoGenFailed);
  } finally {
    cancel();
  }
}

export async function generateVideo(renderImageUrl: string): Promise<Buffer> {
  const provider = process.env.VIDEO_PROVIDER ?? "sora";
  if (provider === "sora") return await generateVideoSora(renderImageUrl);
  throw new Error(ERRORS.providerMisconfigured);
}
