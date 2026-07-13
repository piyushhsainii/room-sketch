import crypto from "node:crypto";

import { NextResponse } from "next/server";

import { ERRORS } from "@/constants/content";
import { readSessionFromCookies } from "@/lib/auth/session";
import { errorMessage } from "@/lib/errorMessage";
import { editRender } from "@/lib/imageGen";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

type Body = {
  project_id: string;
  source_generation_id: string;
  edit_prompt: string;
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
    if (!body.project_id || !body.source_generation_id || !body.edit_prompt) {
      return NextResponse.json(
        { error: ERRORS.generateFailed },
        { status: 400 },
      );
    }

    projectId = body.project_id;

    const { data: projectRaw, error: projectError } = await admin
      .from("projects")
      .select("*")
      .eq("id", body.project_id)
      .eq("user_id", session.userId)
      .single();

    const project = projectRaw ?? null;
    if (projectError || !project) {
      return NextResponse.json(
        { error: projectError?.message ?? ERRORS.projectNotFound },
        { status: 404 },
      );
    }

    const { data: srcRaw, error: srcError } = await admin
      .from("project_generations")
      .select("*")
      .eq("id", body.source_generation_id)
      .eq("project_id", project.id)
      .eq("user_id", session.userId)
      .single();

    const source = srcRaw ?? null;
    if (srcError || !source?.render_url) {
      return NextResponse.json(
        { error: ERRORS.projectNotFound },
        { status: 404 },
      );
    }

    const editPrompt = body.edit_prompt.trim().slice(0, 500);
    if (!editPrompt) {
      return NextResponse.json(
        { error: ERRORS.generateFailed },
        { status: 400 },
      );
    }

    await admin
      .from("projects")
      .update({ status: "rendering", error_message: null })
      .eq("id", project.id)
      .eq("user_id", session.userId);

    const editedSourceUrl = await editRender(
      source.render_url,
      editPrompt,
      project.style_context ?? undefined,
    );
    const { bytes, contentType } = await downloadBytes(editedSourceUrl);
    const renderExt = extForContentType(contentType);

    const renderPath = `${session.userId}/${crypto.randomUUID()}.${renderExt}`;
    const { error: renderUploadError } = await admin.storage
      .from("renders")
      .upload(renderPath, bytes, {
        contentType: contentType ?? "image/png",
        upsert: false,
      });

    if (renderUploadError) throw new Error(renderUploadError.message);

    const { data: renderUrlData } = admin.storage
      .from("renders")
      .getPublicUrl(renderPath);
    const renderUrl = renderUrlData.publicUrl;

    const { data: genRow, error: genError } = await admin
      .from("project_generations")
      .insert({
        project_id: project.id,
        user_id: session.userId,
        generation_type: "render",
        render_url: renderUrl,
        video_url: null,
        style_context: project.style_context,
        parent_generation_id: source.id,
        edit_prompt: editPrompt,
      })
      .select("id")
      .single();

    if (genError) throw new Error(genError.message);

    await admin
      .from("projects")
      .update({ status: "completed", render_url: renderUrl })
      .eq("id", project.id)
      .eq("user_id", session.userId);

    return NextResponse.json({
      render_url: renderUrl,
      generation_id: genRow?.id ?? null,
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
