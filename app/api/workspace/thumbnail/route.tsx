import { NextResponse } from "next/server";
import { createServerSupabaseClient, getSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

// Bucket confirmed as "project-thumbnails" in the Supabase dashboard.
const BUCKET = "project-thumbnails";

export async function POST(request: Request) {
    try {
        const supabase = await createServerSupabaseClient();
        const {
            data: { user },
            error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user)
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        // Multipart form-data, NOT JSON.
        const formData = await request.formData();
        const projectId = formData.get("project_id");
        const revision = formData.get("revision");
        const thumbnail = formData.get("thumbnail");

        if (typeof projectId !== "string" || !projectId) {
            return NextResponse.json(
                { error: "Missing project_id" },
                { status: 400 },
            );
        }
        if (!(thumbnail instanceof File)) {
            return NextResponse.json(
                { error: "Missing thumbnail file" },
                { status: 400 },
            );
        }

        if (revision !== null && (typeof revision !== "string" || !/^[a-f0-9-]{36}$/.test(revision))) {
            return NextResponse.json({ error: "Invalid thumbnail revision" }, { status: 400 });
        }

        // Ownership check — the REAL authorization boundary for this route.
        // Uses the authenticated user's own session (not service role), so
        // this genuinely enforces "you can only upload a thumbnail for a
        // project you own" regardless of what happens below.
        const { data: project } = await supabase
            .from("projects")
            .select("id, revision:floorplan_editor_state->>revision")
            .eq("id", projectId)
            .eq("user_id", user.id)
            .single();

        if (!project) {
            return NextResponse.json({ error: "Not found" }, { status: 404 });
        }

        if ((project.revision ?? null) !== revision) {
            return NextResponse.json({ error: "Project has a newer save" }, { status: 409 });
        }

        const arrayBuffer = await thumbnail.arrayBuffer();
        const bytes = new Uint8Array(arrayBuffer);
        const path = `${projectId}/${crypto.randomUUID()}.jpg`;

        const serviceSupabase = getSupabaseServerClient();

        const { error: uploadError } = await serviceSupabase.storage
            .from(BUCKET)
            .upload(path, bytes, {
                contentType: thumbnail.type || "image/jpeg",
                upsert: false,
            });

        if (uploadError) {
            console.error("[thumbnail] upload failed (full):", JSON.stringify(uploadError, null, 2));
            return NextResponse.json(
                { error: "Thumbnail upload failed" },
                { status: 500 },
            );
        }

        const { data: publicUrlData } = serviceSupabase.storage
            .from(BUCKET)
            .getPublicUrl(path);

        const thumbnailUrl = publicUrlData.publicUrl;
        const update = supabase
            .from("projects")
            .update({ thumbnail_url: thumbnailUrl })
            .eq("id", projectId)
            .eq("user_id", user.id);
        const guardedUpdate = revision === null
            ? update.is("floorplan_editor_state->>revision", null)
            : update.eq("floorplan_editor_state->>revision", revision);
        const { data: updated, error } = await guardedUpdate.select("id").maybeSingle();
        if (error || !updated) {
            await serviceSupabase.storage.from(BUCKET).remove([path]);
            return NextResponse.json(
                { error: error ? "Could not save thumbnail" : "Project has a newer save" },
                { status: error ? 500 : 409 },
            );
        }

        return NextResponse.json({ thumbnail_url: thumbnailUrl });
    } catch (err) {
        console.error("[thumbnail] unexpected error:", err);
        return NextResponse.json(
            { error: "Failed to upload thumbnail" },
            { status: 500 },
        );
    }
}