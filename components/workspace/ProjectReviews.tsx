import { useCallback, useEffect, useState } from 'react'
import { menuButton } from '../ui/editor-menu-theme'

type Comment = { id: string; floor_id: string | null; author_name: string; body: string; resolved: boolean; created_at: string }

export function ProjectReviews({ projectId, token, floors, activeFloorId }: {
    projectId?: string; token?: string; floors: { id: string; label: string }[]; activeFloorId?: string
}) {
    const [comments, setComments] = useState<Comment[]>([])
    const [body, setBody] = useState('')
    const [floorId, setFloorId] = useState(activeFloorId ?? '')
    const [canComment, setCanComment] = useState(false)
    const [canResolve, setCanResolve] = useState(false)
    const [loading, setLoading] = useState(true)
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState('')
    const query = new URLSearchParams(token ? { token } : { project_id: projectId ?? '' }).toString()
    const load = useCallback(async (signal?: AbortSignal) => {
        try {
            const response = await fetch('/api/workspace/reviews?' + query, { cache: 'no-store', signal })
            const data = await response.json()
            if (!response.ok) throw new Error(data.error ?? 'Unable to load reviews.')
            setComments(data.comments); setCanComment(data.canComment); setCanResolve(data.canResolve); setError('')
        } catch (error) {
            if (!signal?.aborted) setError(error instanceof Error ? error.message : 'Unable to load reviews.')
        } finally { if (!signal?.aborted) setLoading(false) }
    }, [query])
    useEffect(() => {
        const controller = new AbortController()
        setLoading(true)
        void load(controller.signal)
        return () => controller.abort()
    }, [load])
    async function mutate(method: 'POST' | 'PATCH', data: object) {
        setBusy(true); setError('')
        try {
            const response = await fetch('/api/workspace/reviews', {
                method, headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ project_id: projectId, token, ...data }),
            })
            const result = await response.json()
            if (!response.ok) throw new Error(result.error ?? 'Unable to save review.')
            if (method === 'POST') setBody('')
            await load()
        } catch (error) { setError(error instanceof Error ? error.message : 'Unable to save review.') }
        finally { setBusy(false) }
    }
    return <section aria-label="Project reviews" className="space-y-3 text-sm">
        <div className="flex items-center justify-between"><h3 className="font-semibold">Client reviews</h3>
            <button type="button" disabled={busy} onClick={() => void load()} className={menuButton}>Refresh</button></div>
        {loading && <p role="status">Loading reviews…</p>}
        {error && <p role="alert" className="text-red-800">{error}</p>}
        {!loading && !error && comments.length === 0 && <p className="text-neutral-500">No comments yet.</p>}
        {comments.map(comment => <article key={comment.id} className="space-y-2 rounded-xl border border-neutral-200 bg-white p-3">
            <p className="font-medium">{comment.author_name} <span className="font-normal text-neutral-500">· {new Date(comment.created_at).toLocaleString()}</span></p>
            {comment.floor_id && <p className="text-xs text-neutral-500">{floors.find(floor => floor.id === comment.floor_id)?.label ?? 'Removed floor'}</p>}
            <p className="whitespace-pre-wrap break-words">{comment.body}</p>
            {canResolve ? <button type="button" disabled={busy} className={menuButton + ' bg-neutral-100'}
                onClick={() => void mutate('PATCH', { id: comment.id, resolved: !comment.resolved })}>{comment.resolved ? 'Reopen' : 'Mark resolved'}</button>
                : comment.resolved && <p className="text-xs text-neutral-500">Resolved</p>}
        </article>)}
        {comments.length === 200 && <p className="text-xs text-neutral-500">Showing the latest 200 comments.</p>}
        {canComment && <form className="space-y-2" onSubmit={event => { event.preventDefault(); void mutate('POST', { body, floor_id: floorId || null }) }}>
            <label className="block">Comment on
                <select value={floorId} onChange={event => setFloorId(event.target.value)} className="mt-1 min-h-10 w-full rounded-lg border border-neutral-200 px-2">
                    <option value="">Whole project</option>{floors.map(floor => <option key={floor.id} value={floor.id}>{floor.label}</option>)}
                </select>
            </label>
            <label className="block">Comment<textarea value={body} required maxLength={2000} onChange={event => setBody(event.target.value)}
                className="mt-1 min-h-24 w-full rounded-lg border border-neutral-200 p-2" /></label>
            <button type="submit" disabled={busy || !body.trim()} className={menuButton + ' bg-neutral-900 text-white'}>{busy ? 'Saving…' : 'Post comment'}</button>
        </form>}
        {!canComment && !loading && !error && <a className="underline underline-offset-2" href={'/login?' + new URLSearchParams({ redirectTo: typeof window !== 'undefined' ? window.location.pathname : '/dashboard' })}>Sign in to leave a comment</a>}
    </section>
}
