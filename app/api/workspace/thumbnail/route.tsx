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

        // Ownership check — the REAL authorization boundary for this route.
        // Uses the authenticated user's own session (not service role), so
        // this genuinely enforces "you can only upload a thumbnail for a
        // project you own" regardless of what happens below.
        const { data: project } = await supabase
            .from("projects")
            .select("id")
            .eq("id", projectId)
            .eq("user_id", user.id)
            .single();

        if (!project) {
            return NextResponse.json({ error: "Not found" }, { status: 404 });
        }

        const arrayBuffer = await thumbnail.arrayBuffer();
        const bytes = new Uint8Array(arrayBuffer);
        const path = `${projectId}/thumbnail.jpg`;

        const serviceSupabase = getSupabaseServerClient();

        const { error: uploadError } = await serviceSupabase.storage
            .from(BUCKET)
            .upload(path, bytes, {
                contentType: thumbnail.type || "image/jpeg",
                upsert: true,
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

        // Cache-bust — same path reused on every save (upsert), so without
        // a query param the browser/CDN may keep serving the stale image.
        const thumbnailUrl = `${publicUrlData.publicUrl}?t=${Date.now()}`;

        // Persist via the regular authenticated client — still scoped by
        // user_id, still a real authorization check, not service role.
        await supabase
            .from("projects")
            .update({ thumbnail_url: thumbnailUrl })
            .eq("id", projectId)
            .eq("user_id", user.id);

        return NextResponse.json({ thumbnail_url: thumbnailUrl });
    } catch (err) {
        console.error("[thumbnail] unexpected error:", err);
        return NextResponse.json(
            { error: "Failed to upload thumbnail" },
            { status: 500 },
        );
    }
}