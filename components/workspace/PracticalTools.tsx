import { useEffect, useMemo, useRef, useState } from 'react'
import { Download, X } from 'lucide-react'
import type { FloorPlanState } from './lib/constants'
import type { ProjectFloorPlan } from './lib/floor-data'
import type { SceneConfig } from './lib/scene-config'
import { canonicalJSON, comparePlans, measureProject, measurementsCSV } from './lib/practical-features'
import { checkpoints, saveCheckpoint, type LocalCheckpoint } from './lib/practical-storage'
import { TraceImport } from './TraceImport'
import { ProjectReviews } from './ProjectReviews'
import { editorMenuTheme, menuButton } from '../ui/editor-menu-theme'
import { WORKSPACE_TEMPLATES, type WorkspaceTemplate } from '../dashboard/workspaceTemplates'
import { finishModernOffice } from '../dashboard/officeFinish'

export function PracticalTools({ open, onClose, projectId, plan, config, onRestore, onChangeFloor }: {
    open: boolean; onClose: () => void; projectId?: string
    plan: ProjectFloorPlan; config: SceneConfig
    onRestore: (plan: ProjectFloorPlan, config: SceneConfig) => void
    onChangeFloor: (state: FloorPlanState) => void
}) {
    const dialog = useRef<HTMLDialogElement>(null)
    const [draftKey] = useState(() => {
        try {
            const query = new URLSearchParams(window.location.search)
            const explicit = query.get('draft') ?? query.get('draftId')
            if (explicit) return explicit
            const storageKey = 'roomsketch:tools:draftKey:' + (query.get('template') ?? 'blank')
            const key = sessionStorage.getItem(storageKey) ?? crypto.randomUUID()
            sessionStorage.setItem(storageKey, key)
            return key
        } catch { return crypto.randomUUID() }
    })
    const projectKey = projectId ?? draftKey
    const [entries, setEntries] = useState<LocalCheckpoint[]>([])
    const [selected, setSelected] = useState('')
    const [name, setName] = useState('')
    const [error, setError] = useState('')
    const [status, setStatus] = useState('')
    const [busy, setBusy] = useState(false)
    const initial = useRef({ plan, config })
    const generation = useRef(0)
    const fp = plan.floors.find(floor => floor.id === plan.activeFloorId)!.state
    const quantities = useMemo(() => measureProject(plan), [plan])
    const checkpoint = entries.find(entry => entry.id === selected)
    const diff = useMemo(() => checkpoint ? comparePlans(checkpoint.plan, plan) : null, [checkpoint, plan])
    const sceneChanged = useMemo(() => checkpoint ? canonicalJSON(checkpoint.config) !== canonicalJSON(config) : false, [checkpoint, config])

    useEffect(() => {
        if (open) dialog.current?.showModal()
        else dialog.current?.close()
    }, [open])
    useEffect(() => {
        let cancelled = false
        checkpoints(projectKey).then(items => { if (!cancelled) setEntries(items) })
            .catch(() => { if (!cancelled) setError('Local recovery storage is unavailable. Keep this tab open and save to your account.') })
        return () => { cancelled = true }
    }, [projectKey])
    useEffect(() => {
        if (initial.current.plan === plan && initial.current.config === config) return
        const version = ++generation.current
        let written = false
        const persist = async () => {
            if (written) return
            written = true
            try {
                await saveCheckpoint({ id: 'recovery:' + crypto.randomUUID(), projectKey, label: 'Automatic recovery', savedAt: Date.now(), plan, config })
                const items = await checkpoints(projectKey)
                if (version === generation.current) { setEntries(items); setStatus('Recovery checkpoint saved on this device.') }
            } catch { written = false; if (version === generation.current) setError('Unable to save a recovery checkpoint on this device.') }
        }
        const timer = setTimeout(persist, 2000)
        const flush = () => { if (document.visibilityState === 'hidden') void persist() }
        document.addEventListener('visibilitychange', flush)
        return () => { clearTimeout(timer); generation.current++; document.removeEventListener('visibilitychange', flush) }
    }, [plan, config, projectKey])

    async function saveAlternative() {
        if (!name.trim()) return
        setBusy(true); setError('')
        try {
            const entry = { id: crypto.randomUUID(), projectKey, label: name.trim().slice(0, 100), savedAt: Date.now(), plan, config }
            await saveCheckpoint(entry)
            setEntries(await checkpoints(projectKey))
            setSelected(entry.id); setName(''); setStatus('Alternative saved on this device.')
        } catch { setError('Unable to save this alternative. Your current plan is still open.') }
        finally { setBusy(false) }
    }
    async function restore() {
        if (!checkpoint) return
        setBusy(true); setError('')
        try {
            await saveCheckpoint({ id: crypto.randomUUID(), projectKey, label: 'Before restoring ' + checkpoint.label, savedAt: Date.now(), plan, config })
            onRestore(structuredClone(checkpoint.plan), structuredClone(checkpoint.config))
            setEntries(await checkpoints(projectKey))
            setSelected(''); setStatus('Checkpoint restored. Save Floor Plan to update the cloud project.')
        } catch { setError('Restore could not be completed. Check local storage and try again.') }
        finally { setBusy(false) }
    }
    async function loadTemplate(template: WorkspaceTemplate) {
        setBusy(true)
        setError('')
        try {
            const layout = template.create()
            await saveCheckpoint({ id: crypto.randomUUID(), projectKey, label: 'Before loading ' + template.label,
                savedAt: Date.now(), plan, config })
            setEntries(await checkpoints(projectKey))
            onRestore(layout.plan, layout.sceneConfig)
            setSelected('')
            setStatus(template.label + ' loaded. Your previous layout is saved as a local checkpoint.')
        } catch {
            setError('The template could not be loaded. Check local storage and try again.')
        } finally {
            setBusy(false)
        }
    }
    function download() {
        const url = URL.createObjectURL(new Blob(['\uFEFF', measurementsCSV(plan)], { type: 'text/csv;charset=utf-8' }))
        const anchor = document.createElement('a')
        anchor.href = url; anchor.download = 'roomsketch-quantities.csv'; anchor.click()
        setTimeout(() => URL.revokeObjectURL(url), 1000)
    }
    async function applyOfficeFinish() {
        setBusy(true); setError('')
        try {
            const finished = finishModernOffice(plan, config)
            await saveCheckpoint({ id: crypto.randomUUID(), projectKey, label: 'Before modern office finishes', savedAt: Date.now(), plan, config })
            onRestore(finished.plan, finished.sceneConfig)
            setEntries(await checkpoints(projectKey)); setSelected('')
            setStatus('Modern office finishes and connected stairwells applied. Save Floor Plan to update this project.')
        } catch (error) { setError(error instanceof Error ? error.message : 'Unable to apply office finishes.') }
        finally { setBusy(false) }
    }
    return <dialog ref={dialog} aria-labelledby="project-tools-heading" onCancel={onClose}
        onKeyDown={event => event.stopPropagation()}
        className="fixed inset-0 m-auto max-h-[90dvh] w-[min(720px,calc(100vw-24px))] overflow-y-auto rounded-2xl border border-neutral-200 bg-white p-5 text-neutral-900 shadow-xl backdrop:bg-black/30"
        style={{ fontFamily: editorMenuTheme.font }}>
        <header className="mb-5 flex items-center justify-between">
            <h2 id="project-tools-heading" className="text-lg font-semibold tracking-tight">Project tools</h2>
            <button type="button" onClick={onClose} aria-label="Close project tools" className={menuButton}><X size={16} /></button>
        </header>
        <div className="space-y-6">
            <details className="rounded-xl border border-neutral-200 p-3 text-sm">
                <summary className="cursor-pointer font-medium">Workspace templates</summary>
                <p className="my-3 leading-5 text-neutral-600">Loading a template replaces the current layout after saving it as a local checkpoint.</p>
                <div className="flex flex-wrap gap-2">
                    {WORKSPACE_TEMPLATES.map(template => (
                        <button key={template.id} type="button" disabled={busy} onClick={() => loadTemplate(template)}
                            className={menuButton + ' border border-neutral-300'}>Load {template.label}</button>
                    ))}
                </div>
                {plan.floors.length === 3 && plan.floors.every(floor => floor.id.startsWith('office-')) && <>
                    <p className="my-3 leading-5 text-neutral-600">Keep your office layout and add coordinated oak, stone and woven finishes, studio signage, dressed workstations and connected stairwells. Preserves a checkpoint first.</p>
                    <button type="button" disabled={busy} onClick={applyOfficeFinish} className={menuButton + ' border border-neutral-300'}>Apply modern office finishes</button>
                </>}
            </details>
            <section className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="font-semibold">Measurements and quantities</h3>
                    <button type="button" onClick={download} className={menuButton + ' border border-neutral-200'}><Download size={16} />Export CSV</button>
                </div>
                <p className="text-xs leading-5 text-neutral-500">Areas are gross sums of defined spaces. Overlapping spaces are counted separately. Cutout regions are excluded as spaces. Perimeters include shared boundaries.</p>
                {quantities.map(floor => <details key={floor.id} className="rounded-xl border border-neutral-200 p-3" open={floor.id === plan.activeFloorId}>
                    <summary className="cursor-pointer text-sm font-medium">{floor.label} · {floor.area.toFixed(2)} m² · {floor.spaces.length} spaces</summary>
                    <table className="mt-3 w-full text-left text-sm"><thead><tr><th scope="col">Space</th><th scope="col">Area</th><th scope="col">Perimeter</th></tr></thead>
                        <tbody>{floor.spaces.map(space => <tr key={space.id}><td className="py-1">{space.label}</td><td>{space.area.toFixed(2)} m²</td><td>{space.perimeter.toFixed(2)} m</td></tr>)}</tbody>
                    </table>
                    <ul className="mt-2 flex flex-wrap gap-2 text-xs text-neutral-600">{floor.counts.map(([type, count]) => <li key={type} className="rounded-lg bg-neutral-100 px-2 py-1">{type.replaceAll('_', ' ')} × {count}</li>)}</ul>
                </details>)}
            </section>
            <section className="space-y-3 border-t border-neutral-200 pt-5">
                <h3 className="font-semibold">Design alternatives and recovery</h3>
                <p className="text-xs leading-5 text-neutral-500">Checkpoints stay in this browser. Keep up to 20 named alternatives and five automatic recoveries. Restoring first saves your current plan as an alternative.</p>
                <div className="flex gap-2">
                    <input aria-label="Alternative name" placeholder="Alternative name" value={name} maxLength={100} onChange={event => setName(event.target.value)} className="min-w-0 flex-1 rounded-xl border border-neutral-200 px-3 text-sm" />
                    <button type="button" onClick={saveAlternative} disabled={busy || !name.trim()} className={menuButton + ' bg-neutral-900 text-white'}>Save alternative</button>
                </div>
                <select aria-label="Checkpoint to compare" value={selected} onChange={event => setSelected(event.target.value)} className="min-h-10 w-full rounded-xl border border-neutral-200 px-3 text-sm">
                    <option value="">Choose a checkpoint to compare</option>
                    {entries.map(entry => <option key={entry.id} value={entry.id}>{entry.label} · {new Date(entry.savedAt).toLocaleString()}</option>)}
                </select>
                {checkpoint && diff && <div className="space-y-2 rounded-xl bg-neutral-100 p-3 text-sm">
                    <p>Current plan compared with “{checkpoint.label}”</p>
                    <p>{diff.added} added · {diff.removed} removed · {diff.changed} changed · Scene settings {sceneChanged ? 'changed' : 'unchanged'}</p>
                    <ul className="max-h-40 space-y-1 overflow-auto text-xs text-neutral-600">
                        {diff.changes.map(change => <li key={change.id}>{change.action} · {change.floor ? change.floor + ' / ' : ''}{change.label}</li>)}
                    </ul>
                    <button type="button" onClick={restore} disabled={busy} className={menuButton + ' border border-neutral-300 bg-white'}>Restore this checkpoint</button>
                </div>}
            </section>
            <section className="space-y-3 border-t border-neutral-200 pt-5">
                <h3 className="font-semibold">Trace a floor plan</h3>
                <TraceImport onApply={image => { onChangeFloor({ ...fp, tracingImage: image }); setStatus('Calibrated image added to the active floor.') }} />
                {fp.tracingImage && <div className="grid grid-cols-2 gap-3 text-sm">
                    {(['x', 'z'] as const).map(axis => <label key={axis}>Image {axis.toUpperCase()} (m)<input type="number" step="0.1" value={fp.tracingImage![axis]}
                        onChange={event => { const value = Number(event.target.value); if (Number.isFinite(value)) onChangeFloor({ ...fp, tracingImage: { ...fp.tracingImage!, [axis]: value } }) }}
                        className="mt-1 w-full rounded-lg border border-neutral-200 p-2" /></label>)}
                    <label className="col-span-2">Opacity<input type="range" min="0.05" max="1" step="0.05" value={fp.tracingImage.opacity}
                        onChange={event => onChangeFloor({ ...fp, tracingImage: { ...fp.tracingImage!, opacity: Number(event.target.value) } })} className="block w-full" /></label>
                    <button type="button" onClick={() => onChangeFloor({ ...fp, tracingImage: undefined })} className={menuButton + ' border border-neutral-200'}>Remove tracing image</button>
                </div>}
            </section>
            <section className="space-y-3 border-t border-neutral-200 pt-5">
                <h3 className="font-semibold">Room dimension constraints</h3>
                <p className="text-xs leading-5 text-neutral-500">Locked dimensions stay fixed during resize and wall edits. Select a rectangular room on the canvas to see alignment guides.</p>
                {fp.rooms.length === 0 && <p className="text-sm text-neutral-500">Draw a rectangular room to add dimension constraints.</p>}
                {fp.rooms.map(room => <div key={room.id} className="flex flex-wrap items-center gap-3 rounded-xl bg-neutral-100 p-3 text-sm">
                    <span className="min-w-24 flex-1 font-medium">{room.label}</span>
                    {(['width', 'depth'] as const).map(axis => <label key={axis} className="flex items-center gap-2">
                        <input type="checkbox" checked={room.dimensionLock?.[axis] !== undefined}
                            onChange={event => onChangeFloor({ ...fp, rooms: fp.rooms.map(item => item.id === room.id
                                ? { ...item, dimensionLock: { ...item.dimensionLock, [axis]: event.target.checked ? item[axis] : undefined } } : item) })} className="accent-neutral-900" />
                        Lock {axis} ({room[axis].toFixed(2)} m)
                    </label>)}
                </div>)}
            </section>
            <div className="border-t border-neutral-200 pt-5">
                {projectId ? <ProjectReviews projectId={projectId} floors={plan.floors} activeFloorId={plan.activeFloorId} />
                    : <p className="text-sm text-neutral-500">Save this project to your account to enable client reviews.</p>}
            </div>
            {status && <p role="status" className="text-sm text-neutral-600">{status}</p>}
            {error && <p role="alert" className="text-sm text-red-800">{error}</p>}
        </div>
    </dialog>
}
