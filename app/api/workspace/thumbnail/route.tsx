import { NextResponse } from "next/server";
import { readSessionFromCookies } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
    try {
        const session = await readSessionFromCookies();
        if (!session)
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const formData = await request.formData();
        const projectId = formData.get("project_id");
        const file = formData.get("thumbnail");

        if (typeof projectId !== "string" || !(file instanceof File)) {
            return NextResponse.json({ error: "Missing fields" }, { status: 400 });
        }

        const admin = await createServerSupabaseClient();

        // Ownership check — same pattern as floorplan-editor-state route
        const { data: project } = await admin
            .from("projects")
            .select("id")
            .eq("id", projectId)
            .eq("user_id", session.userId)
            .single();

        if (!project)
            return NextResponse.json({ error: "Not found" }, { status: 404 });

        const bytes = new Uint8Array(await file.arrayBuffer());
        const path = `${projectId}/thumbnail.jpg`;

        const { error: uploadError } = await admin.storage
            .from("project-thumbnails")
            .upload(path, bytes, { contentType: "image/jpeg", upsert: true });

        if (uploadError) {
            console.error("[thumbnail upload]", uploadError);
            return NextResponse.json({ error: "Upload failed" }, { status: 500 });
        }

        const { data: urlData } = admin.storage
            .from("project-thumbnails")
            .getPublicUrl(path);

        const thumbnailUrl = `${urlData.publicUrl}?v=${Date.now()}`;

        const { error: updateError } = await admin
            .from("projects")
            .update({ thumbnail_url: thumbnailUrl })
            .eq("id", projectId)
            .eq("user_id", session.userId);

        if (updateError) {
            console.error("[thumbnail db update]", updateError);
            return NextResponse.json({ error: "Failed to save thumbnail URL" }, { status: 500 });
        }

        return NextResponse.json({ ok: true, thumbnail_url: thumbnailUrl });
    } catch (error) {
        console.error("[thumbnail route]", error);
        return NextResponse.json({ error: "Failed to upload thumbnail" }, { status: 500 });
    }
}