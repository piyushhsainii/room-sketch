import crypto from "node:crypto";

import { NextResponse } from "next/server";

import { ERRORS, SKETCHUP } from "@/constants/content";
import { readSessionFromCookies } from "@/lib/auth/session";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

const MAX_BYTES = 50 * 1024 * 1024;

function filenameWithoutExt(name: string): string {
  const cleaned = name.replace(/\.[^/.]+$/, "");
  return cleaned || name;
}

export async function POST(request: Request) {
  try {
    const session = await readSessionFromCookies();
    if (!session) {
      return NextResponse.json({ error: ERRORS.unauthorized }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: ERRORS.missingFile }, { status: 400 });
    }

    const ext = file.name.split(".").pop()?.toLowerCase();
    if (ext !== "skp") {
      return NextResponse.json({ error: SKETCHUP.errorInvalidFile }, { status: 400 });
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: SKETCHUP.errorFileTooLarge }, { status: 400 });
    }

    const admin = createSupabaseAdmin();

    {
      const { error: userUpsertError } = await admin
        .from("users")
        .upsert({ id: session.userId }, { onConflict: "id", ignoreDuplicates: true });

      if (userUpsertError) {
        return NextResponse.json({ error: userUpsertError.message }, { status: 500 });
      }
    }

    const objectPath = `${session.userId}/${crypto.randomUUID()}.skp`;
    const bytes = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await admin.storage
      .from("floorplans")
      .upload(objectPath, bytes, { contentType: "application/vnd.sketchup.skp", upsert: false });

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    const { data: urlData } = admin.storage.from("floorplans").getPublicUrl(objectPath);
    const floorplanUrl = urlData.publicUrl;

    const { data: inserted, error: insertError } = await admin
      .from("projects")
      .insert({
        user_id: session.userId,
        floorplan_url: floorplanUrl,
        status: "uploaded",
        generation_type: "render",
        name: filenameWithoutExt(file.name),
      })
      .select("id,floorplan_url,name,status,generation_type,created_at")
      .single();

    if (insertError || !inserted) {
      return NextResponse.json(
        { error: insertError?.message ?? ERRORS.uploadFailed },
        { status: 500 }
      );
    }

    return NextResponse.json({
      project_id: inserted.id,
      floorplan_url: inserted.floorplan_url,
      name: inserted.name,
      status: inserted.status,
      generation_type: inserted.generation_type,
      created_at: inserted.created_at,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: message || ERRORS.uploadFailed }, { status: 500 });
  }
}
