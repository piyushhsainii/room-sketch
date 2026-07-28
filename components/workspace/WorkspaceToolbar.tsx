'use client'

import { WORKSPACE } from '@/constants/content'
import type { CameraMode } from '@/types/workspace'

type Props = {
  mode: CameraMode
  onModeChange: (mode: CameraMode) => void
  onReset: () => void
  isFullscreen: boolean
  onToggleFullscreen: () => void
  onExit: () => void
}

function ResetIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M20 12a8 8 0 1 1-2.3-5.7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M20 4v6h-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function ExitIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function CubeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
    </svg>
  )
}

function WalkIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M12 12l6-3-6-3-6 3 6 3Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M6 9v6l6 3 6-3V9" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  )
}

function TopIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M4 8h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M4 16h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M8 4v16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M16 4v16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

export default function WorkspaceToolbar({ mode, onModeChange, onReset, isFullscreen, onToggleFullscreen, onExit }: Props) {
  const help = mode === 'topdown' ? WORKSPACE.cameraHelp.topDown : WORKSPACE.cameraHelp[mode]

  return (
    <div className="wsBar" role="toolbar" aria-label={WORKSPACE.buttonLabel}>
      <div className="wsLeft">
        <button
          type="button"
          className={`wsPill ${mode === 'orbit' ? 'wsActive' : ''}`}
          onClick={() => onModeChange('orbit')}
          title={WORKSPACE.toolbar.orbit}
        >
          <CubeIcon />
          <span className="wsLbl">{WORKSPACE.toolbar.orbit}</span>
        </button>
        <button
          type="button"
          className={`wsPill ${mode === 'walk' ? 'wsActive' : ''}`}
          onClick={() => onModeChange('walk')}
          title={WORKSPACE.toolbar.walk}
        >
          <WalkIcon />
          <span className="wsLbl">{WORKSPACE.toolbar.walk}</span>
        </button>
        <button
          type="button"
          className={`wsPill ${mode === 'topdown' ? 'wsActive' : ''}`}
          onClick={() => onModeChange('topdown')}
          title={WORKSPACE.toolbar.topDown}
        >
          <TopIcon />
          <span className="wsLbl">{WORKSPACE.toolbar.topDown}</span>
        </button>
      </div>

      <div className="wsCenter">{help}</div>

      <div className="wsRight">
        <button type="button" className="wsGhost" onClick={onReset} title={WORKSPACE.toolbar.reset}>
          <ResetIcon />
          <span className="wsLbl">{WORKSPACE.toolbar.reset}</span>
        </button>
        <button
          type="button"
          onClick={onToggleFullscreen}
          title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
          className="wsGhost"
        >
          {isFullscreen ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 0 2-2h3M3 16h3a2 2 0 0 0 2 2v3" />
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
            </svg>
          )}
          <span className="wsLbl hidden sm:inline">{isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}</span>
        </button>
        <button type="button" className="wsGhost wsExit" onClick={onExit} title={WORKSPACE.toolbar.exit}>
          <ExitIcon />
          <span className="wsLbl">{WORKSPACE.toolbar.exit}</span>
        </button>
      </div>

      <style jsx>{`
        .wsBar {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 48px;
          padding: 8px 12px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          z-index: 70;
          background: rgba(18, 33, 62, 0.85);
          backdrop-filter: blur(12px);
          border-bottom: 1px solid rgba(247, 246, 241, 0.1);
          font-family: var(--font-body, inherit);
        }
        .wsLeft,
        .wsRight {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .wsCenter {
          flex: 1;
          text-align: center;
          font-family: "JetBrains Mono", monospace;
          font-size: 11px;
          letter-spacing: 0.01em;
          color: rgba(247, 246, 241, 0.55);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .wsPill {
          height: 32px;
          padding: 0 14px;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          border-radius: 999px;
          border: 1px solid rgba(247, 246, 241, 0.14);
          background: transparent;
          color: rgba(247, 246, 241, 0.75);
          transition: background 150ms ease, border-color 150ms ease, color 150ms ease;
          cursor: pointer;
        }
        .wsPill:hover {
          background: rgba(247, 246, 241, 0.08);
          border-color: rgba(247, 246, 241, 0.24);
        }
        .wsActive {
          background: #5b7fd6;
          border-color: #5b7fd6;
          color: white;
        }
        .wsGhost {
          height: 32px;
          padding: 0 12px;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          border-radius: 999px;
          border: 1px solid rgba(247, 246, 241, 0.14);
          background: transparent;
          color: rgba(247, 246, 241, 0.75);
          transition: background 150ms ease, border-color 150ms ease, color 150ms ease;
          cursor: pointer;
          font-size: 13px;
        }
        .wsGhost:hover {
          background: rgba(247, 246, 241, 0.08);
          border-color: rgba(247, 246, 241, 0.24);
        }
        .wsExit:hover {
          background: rgba(198, 91, 78, 0.16);
          border-color: rgba(198, 91, 78, 0.4);
          color: #e8897c;
        }
        .wsLbl {
          font-size: 13px;
          font-weight: 500;
        }
        @media (max-width: 768px) {
          .wsCenter {
            display: none;
          }
          .wsLbl {
            display: none;
          }
          .wsPill,
          .wsGhost {
            width: 38px;
            padding: 0;
            justify-content: center;
          }
        }
      `}</style>
    </div>
  )
}