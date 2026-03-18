import crypto from "node:crypto";

import { NextResponse } from "next/server";

import { ERRORS } from "@/constants/content";
import { readSessionFromCookies } from "@/lib/auth/session";
import { errorMessage } from "@/lib/errorMessage";
import { generateRender } from "@/lib/imageGen";
import { checkCanGenerate, incrementUsage } from "@/lib/planGate";
import type { Project } from "@/lib/models";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { generateVideo } from "@/lib/videoGen";

export const runtime = "nodejs";

type Body = {
  project_id: string;
  generation_type: "render" | "render_video";
  style_context?: string;
  source_generation_id?: string;
};

function extForContentType(type: string | null): string {
  if (!type) return "png";
  if (type.includes("png")) return "png";
  if (type.includes("jpeg")) return "jpg";
  if (type.includes("webp")) return "webp";
  return "png";
}

function decodeDataUrl(
  dataUrl: string,
): { bytes: Uint8Array; contentType: string | null } | null {
  if (!dataUrl.startsWith("data:")) return null;

  const comma = dataUrl.indexOf(",");
  if (comma < 0) return null;

  const meta = dataUrl.slice(5, comma);
  const isBase64 = meta.endsWith(";base64");
  if (!isBase64) return null;

  const contentType = meta.slice(0, -";base64".length) || null;
  const b64 = dataUrl.slice(comma + 1);
  const buf = Buffer.from(b64, "base64");
  return { bytes: new Uint8Array(buf), contentType };
}

async function downloadBytes(
  url: string,
): Promise<{ bytes: Uint8Array; contentType: string | null }> {
  const decoded = decodeDataUrl(url);
  if (decoded) return decoded;

  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), 60_000);
  try {
    const res = await fetch(url, { method: "GET", signal: controller.signal });
    if (!res.ok) throw new Error(ERRORS.imageGenFailed);
    const bytes = new Uint8Array(await res.arrayBuffer());
    return { bytes, contentType: res.headers.get("content-type") };
  } finally {
    clearTimeout(id);
  }
}

export async function POST(request: Request) {
  const admin = createSupabaseAdmin();

  let projectId: string | null = null;

  try {
    const session = await readSessionFromCookies();
    if (!session) {
      return NextResponse.json({ error: ERRORS.unauthorized }, { status: 401 });
    }

    const body = (await request.json()) as Partial<Body>;
    if (!body.project_id || !body.generation_type) {
      return NextResponse.json(
        { error: ERRORS.generateFailed },
        { status: 400 },
      );
    }

    const styleContextRaw =
      typeof body.style_context === "string" ? body.style_context.trim() : "";
    const styleContext =
      styleContextRaw.length > 0 ? styleContextRaw.slice(0, 500) : null;

    const sourceGenerationId =
      typeof body.source_generation_id === "string" &&
      body.source_generation_id.trim().length > 0
        ? body.source_generation_id.trim()
        : null;

    projectId = body.project_id;

    const { data: projectRaw, error: projectError } = await admin
      .from("projects")
      .select("*")
      .eq("id", body.project_id)
      .eq("user_id", session.userId)
      .single();

    const project = (projectRaw ?? null) as Project | null;

    if (projectError || !project) {
      return NextResponse.json(
        { error: projectError?.message ?? ERRORS.projectNotFound },
        { status: 404 },
      );
    }

    const wantsVideo = body.generation_type === "render_video";

    let sourceGenerationRenderUrl: string | null = null;
    if (wantsVideo && sourceGenerationId) {
      const { data: src, error: srcError } = await admin
        .from("project_generations")
        .select("id, render_url")
        .eq("id", sourceGenerationId)
        .eq("project_id", body.project_id)
        .eq("user_id", session.userId)
        .single();

      if (!srcError && src?.render_url) {
        sourceGenerationRenderUrl = src.render_url;
      }
    }

    const needsRender =
      body.generation_type === "render" ||
      (wantsVideo && !sourceGenerationRenderUrl);

    if (needsRender) {
      const gateRender = await checkCanGenerate(session.userId, "render");
      if (!gateRender.allowed) {
        return NextResponse.json(
          { error: gateRender.reason ?? ERRORS.generateFailed },
          { status: 403 },
        );
      }
    }

    if (wantsVideo) {
      const gateVideo = await checkCanGenerate(session.userId, "video");
      if (!gateVideo.allowed) {
        return NextResponse.json(
          { error: gateVideo.reason ?? ERRORS.generateFailed },
          { status: 403 },
        );
      }
    }

    await admin
      .from("projects")
      .update({
        status: "rendering",
        generation_type: body.generation_type,
        ...(needsRender ? { style_context: styleContext } : null),
        error_message: null,
      })
      .eq("id", body.project_id)
      .eq("user_id", session.userId);

    let renderUrl: string | null =
      sourceGenerationRenderUrl ?? project.render_url;

    if (needsRender) {
      const renderSourceUrl = await generateRender(
        project.floorplan_url,
        styleContext ?? undefined,
      );
      const { bytes, contentType } = await downloadBytes(renderSourceUrl);
      const renderExt = extForContentType(contentType);

      const renderPath = `${session.userId}/${crypto.randomUUID()}.${renderExt}`;
      const { error: renderUploadError } = await admin.storage
        .from("renders")
        .upload(renderPath, bytes, {
          contentType: contentType ?? "image/png",
          upsert: false,
        });

      if (renderUploadError) {
        throw new Error(renderUploadError.message);
      }

      const { data: renderUrlData } = admin.storage
        .from("renders")
        .getPublicUrl(renderPath);
      renderUrl = renderUrlData.publicUrl;

      await admin
        .from("projects")
        .update({ render_url: renderUrl })
        .eq("id", body.project_id)
        .eq("user_id", session.userId);
    }

    let videoUrl: string | null = null;
    let generationId: string | null = null;
    const shouldCreateGenerationRow =
      body.generation_type === "render" ||
      (wantsVideo && !sourceGenerationRenderUrl);

    if (shouldCreateGenerationRow && renderUrl) {
      const { data: genRow, error: genError } = await admin
        .from("project_generations")
        .insert({
          project_id: body.project_id,
          user_id: session.userId,
          generation_type: body.generation_type,
          render_url: renderUrl,
          video_url: null,
          style_context: styleContext,
        })
        .select("id")
        .single();

      if (genError) {
        throw new Error(genError.message);
      }
      generationId = (genRow?.id as string | undefined) ?? null;
    }

    if (wantsVideo) {
      if (!renderUrl) throw new Error(ERRORS.videoGenFailed);
      const videoBuffer = await generateVideo(renderUrl);
      const videoPath = `${session.userId}/${crypto.randomUUID()}.mp4`;

      const { error: videoUploadError } = await admin.storage
        .from("videos")
        .upload(videoPath, videoBuffer, {
          contentType: "video/mp4",
          upsert: false,
        });

      if (videoUploadError) {
        throw new Error(videoUploadError.message);
      }

      const { data: videoUrlData } = admin.storage
        .from("videos")
        .getPublicUrl(videoPath);
      videoUrl = videoUrlData.publicUrl;

      await admin
        .from("projects")
        .update({
          video_url: videoUrl,
          ...(sourceGenerationRenderUrl
            ? { render_url: sourceGenerationRenderUrl }
            : null),
        })
        .eq("id", body.project_id)
        .eq("user_id", session.userId);

      const targetGenerationId = sourceGenerationId ?? generationId;
      if (targetGenerationId) {
        await admin
          .from("project_generations")
          .update({ video_url: videoUrl })
          .eq("id", targetGenerationId)
          .eq("user_id", session.userId);
      }
    }

    await admin
      .from("projects")
      .update({ status: "completed" })
      .eq("id", body.project_id)
      .eq("user_id", session.userId);

    if (needsRender) {
      await incrementUsage(session.userId, "render");
    }
    if (wantsVideo) {
      await incrementUsage(session.userId, "video");
    }

    return NextResponse.json({
      render_url: renderUrl,
      video_url: videoUrl,
      status: "completed",
    });
  } catch (e) {
    const message = errorMessage(e);

    if (projectId) {
      try {
        await admin
          .from("projects")
          .update({ status: "failed", error_message: message })
          .eq("id", projectId);
      } catch {
        // ignore
      }
    }

    return NextResponse.json(
      { error: message || ERRORS.generateFailed },
      { status: 500 },
    );
  }
}
