import React, { useState } from 'react'
import { THEME } from '../workspace/FloorPlanEditor';
import { DEFAULT_FP } from '../workspace/lib/constants';
import { ShareDialog } from './ExportShareable';
import { useRouter } from 'next/navigation';

interface WorkspaceNavProps {
    fp: { roomHeight: number;[key: string]: any };
    setFp: React.Dispatch<React.SetStateAction<any>>;
    zoom: number;
    setZoom: (zoom: number) => void;
    setSelectedId: (id: string | null) => void;
    isFullscreen: boolean;
    toggleFullscreen: () => void | Promise<void>;
    sceneConfig: any;
    isSaving?: boolean;
    isSaved?: boolean;
    onClose?: () => void;
    onSave?: (fp: any, sceneConfig: any) => void;
    projectId?: string
}

const WorkspaceNav = ({
    fp,
    setFp,
    zoom,
    setZoom,
    setSelectedId,
    isFullscreen,
    toggleFullscreen,
    sceneConfig,
    isSaving = false,
    isSaved = false,
    onClose,
    onSave,
    projectId,
}: WorkspaceNavProps) => {

    const [shareDialogOpen, setShareDialogOpen] = useState(false)
    const router = useRouter()

    return (
        <div style={{ height: 52, flexShrink: 0, background: THEME.bgPanel, borderBottom: `1px solid ${THEME.border}`, display: 'flex', alignItems: 'center', padding: '0 16px', gap: 12, boxShadow: THEME.shadow }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: THEME.text, letterSpacing: '0.02em' }}>Ground Floor</span>
            <div style={{ flex: 1 }} />
            <label style={{ fontSize: 11, color: THEME.textMuted }}>Ceiling height</label>
            <input type="number" min={2} max={6} step={0.1} value={fp.roomHeight}
                onChange={e => setFp((p: any) => ({ ...p, roomHeight: parseFloat(e.target.value) || 2.7 }))}
                style={{ width: 56, height: 30, borderRadius: 6, border: `1px solid ${THEME.borderStrong}`, background: '#FAFAFA', color: THEME.text, fontSize: 12, textAlign: 'center', outline: 'none' }} />
            <span style={{ fontSize: 11, color: THEME.textFaint }}>m</span>
            <div style={{ width: 1, height: 24, background: THEME.border }} />
            <span style={{ fontSize: 11, color: THEME.textMuted }}>{Math.round(zoom * 100)}%</span>
            <Btn onClick={() => setZoom(1)}>Reset zoom</Btn>
            <Btn onClick={() => { setFp(DEFAULT_FP); setSelectedId(null) }}>Clear</Btn>
            <div style={{ width: 1, height: 24, background: THEME.border }} />
            <button onClick={() => void toggleFullscreen()} style={{ height: 30, padding: '0 12px', borderRadius: 7, border: `1px solid ${THEME.borderStrong}`, background: '#FAFAFA', color: THEME.textMuted, fontSize: 11, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                {isFullscreen
                    ? <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 0 2-2h3M3 16h3a2 2 0 0 0 2 2v3" /></svg>
                    : <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" /></svg>}
                {isFullscreen ? 'Exit' : 'Fullscreen'}
            </button>
            {onClose && <Btn onClick={() => router.push('/dashboard')} danger>✕ Close</Btn>}
            {projectId && (
                <button
                    onClick={() => setShareDialogOpen(true)}
                    style={{
                        height: 30, padding: '0 12px', borderRadius: 7,
                        border: `1px solid ${THEME.borderStrong}`, background: '#FAFAFA',
                        color: THEME.textMuted, fontSize: 11, cursor: 'pointer',
                        display: 'inline-flex', alignItems: 'center', gap: 5,
                    }}
                >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
                        <line x1="8.6" y1="10.6" x2="15.4" y2="6.4" /><line x1="8.6" y1="13.4" x2="15.4" y2="17.6" />
                    </svg>
                    Share
                </button>
            )}
            {onSave &&
                <button
                    onClick={() => onSave(fp, sceneConfig)}
                    style={{
                        height: 32,
                        padding: '0 16px', borderRadius: 8, border: 'none',
                        background: isSaving ? '#A5A6F5' : isSaved ? '#10B981' : THEME.accent,
                        color: 'white', fontSize: 12, fontWeight: 700, cursor: isSaving ? 'not-allowed' : 'pointer', transition: 'background 200ms',
                        boxShadow: '0 2px 6px rgba(99,102,241,0.25)',
                    }}
                    disabled={isSaving}>
                    {isSaving ? 'Saving…' : isSaved ? '✓ Saved' : 'Save Floor Plan'}
                </button>

            }
            {shareDialogOpen && projectId && (
                <ShareDialog projectId={projectId} onClose={() => setShareDialogOpen(false)} />
            )}

        </div>
    )
}

function Btn({ children, onClick, danger }: { children: React.ReactNode; onClick: () => void; danger?: boolean }) {
    return (
        <button onClick={onClick} style={{ height: 28, padding: '0 10px', borderRadius: 6, border: `1px solid ${danger ? 'rgba(239,68,68,0.25)' : 'rgba(148,163,184,0.15)'}`, background: 'transparent', color: danger ? 'rgba(248,113,113,0.8)' : 'rgba(148,163,184,0.7)', fontSize: 11, cursor: 'pointer' }}>
            {children}
        </button>
    )
}

export default WorkspaceNav