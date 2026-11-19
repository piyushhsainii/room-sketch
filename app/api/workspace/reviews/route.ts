import { NextResponse } from 'next/server'
import { createServerSupabaseClient, getSupabaseServerClient } from '@/lib/supabase/server'
import { getShareProject } from '@/components/workspace/lib/getShareProject'

export const runtime = 'nodejs'
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

async function access(projectId: unknown, token: unknown) {
    const session = await createServerSupabaseClient()
    const { data: { user } } = await session.auth.getUser()
    if (typeof token === 'string' && /^[A-Za-z0-9_-]{20,100}$/.test(token)) {
        const shared = await getShareProject(token)
        if (!shared) return null
        return { projectId: shared.id, user, owner: false, editorState: shared.floorplan_editor_state }
    }
    if (!user || typeof projectId !== 'string' || !uuid.test(projectId)) return null
    const { data: project } = await session.from('projects').select('id, floorplan_editor_state')
        .eq('id', projectId).eq('user_id', user.id).maybeSingle()
    return project ? { projectId: project.id, user, owner: true, editorState: project.floorplan_editor_state } : null
}

function databaseError(error: { code?: string }) {
    const missing = error.code === '42P01' || error.code === 'PGRST205'
    return NextResponse.json({ error: missing
        ? 'Project reviews are not available yet. The project review database migration needs to be applied.'
        : 'Unable to update project reviews. Please try again.' }, { status: missing ? 503 : 500 })
}

export async function GET(request: Request) {
    const params = new URL(request.url).searchParams
    const allowed = await access(params.get('project_id'), params.get('token'))
    if (!allowed) return NextResponse.json({ error: 'Project not found or access expired.' }, { status: 404 })
    const { data, error } = await getSupabaseServerClient().from('project_review_comments')
        .select('id, floor_id, author_name, body, resolved, created_at')
        .eq('project_id', allowed.projectId).order('created_at', { ascending: false }).limit(200)
    if (error) return databaseError(error)
    return NextResponse.json({ comments: data ?? [], canComment: !!allowed.user, canResolve: allowed.owner },
        { headers: { 'Cache-Control': 'no-store' } })
}

export async function POST(request: Request) {
    const body = await request.json().catch(() => null)
    if (!body || typeof body.body !== 'string' || !body.body.trim() || body.body.length > 2000) {
        return NextResponse.json({ error: 'Enter a comment between 1 and 2000 characters.' }, { status: 400 })
    }
    const allowed = await access(body.project_id, body.token)
    if (!allowed) return NextResponse.json({ error: 'Project not found or access expired.' }, { status: 404 })
    if (!allowed.user) return NextResponse.json({ error: 'Sign in to leave a comment.' }, { status: 401 })
    const state = allowed.editorState as { projectFloorPlan?: { floors?: { id: string }[] } } | null
    if (body.floor_id != null && (typeof body.floor_id !== 'string' ||
        !state?.projectFloorPlan?.floors?.some(floor => floor.id === body.floor_id))) {
        return NextResponse.json({ error: 'This floor is no longer available. Reload the project.' }, { status: 400 })
    }
    const rawName = allowed.user.user_metadata?.full_name
    const authorName = typeof rawName === 'string' && rawName.trim() ? rawName.trim().slice(0, 100) : 'Reviewer'
    const admin = getSupabaseServerClient()
    // Bound rapid repeat submissions without trusting a client timer.
    const { data: recent, error: recentError } = await admin.from('project_review_comments').select('id')
        .eq('project_id', allowed.projectId).eq('author_id', allowed.user.id)
        .gte('created_at', new Date(Date.now() - 5000).toISOString()).limit(1)
    if (recentError) return databaseError(recentError)
    if (recent?.length) return NextResponse.json({ error: 'Please wait a few seconds before adding another comment.' }, { status: 429 })
    const { data, error } = await admin.from('project_review_comments').insert({
        project_id: allowed.projectId, floor_id: body.floor_id ?? null, author_id: allowed.user.id,
        author_name: authorName, body: body.body.trim(),
    }).select('id').single()
    if (error) return databaseError(error)
    return NextResponse.json({ ok: true, id: data.id }, { status: 201 })
}

export async function PATCH(request: Request) {
    const body = await request.json().catch(() => null)
    if (!body || typeof body.id !== 'string' || !uuid.test(body.id) || typeof body.resolved !== 'boolean') {
        return NextResponse.json({ error: 'Invalid review update.' }, { status: 400 })
    }
    const allowed = await access(body.project_id, null)
    if (!allowed?.owner) return NextResponse.json({ error: 'Only the project owner can resolve comments.' }, { status: 403 })
    const { data, error } = await getSupabaseServerClient().from('project_review_comments')
        .update({ resolved: body.resolved }).eq('id', body.id).eq('project_id', allowed.projectId).select('id').maybeSingle()
    if (error) return databaseError(error)
    if (!data) return NextResponse.json({ error: 'Comment not found.' }, { status: 404 })
    return NextResponse.json({ ok: true })
}
