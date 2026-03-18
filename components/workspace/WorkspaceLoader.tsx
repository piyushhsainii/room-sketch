'use client'

import { WORKSPACE } from '@/constants/content'
import type { WorkspaceStatus } from '@/types/workspace'

type Props = {
  status: WorkspaceStatus
  currentStep: number
}

function Spinner() {
  return (
    <span
      style={{
        width: 12,
        height: 12,
        borderRadius: 999,
        border: '2px solid rgba(99,102,241,0.25)',
        borderTopColor: 'rgba(99,102,241,1)',
        display: 'inline-block',
        animation: 'wsSpin 900ms linear infinite',
      }}
      aria-hidden="true"
    />
  )
}

function Check() {
  return (
    <span
      style={{
        width: 12,
        height: 12,
        borderRadius: 999,
        background: 'rgba(34,197,94,0.9)',
        display: 'inline-grid',
        placeItems: 'center',
        color: 'white',
        fontSize: 10,
        lineHeight: 1,
      }}
      aria-hidden="true"
    >
      ✓
    </span>
  )
}

function Dot() {
  return (
    <span
      style={{
        width: 10,
        height: 10,
        borderRadius: 999,
        background: 'rgba(148,163,184,0.35)',
        display: 'inline-block',
      }}
      aria-hidden="true"
    />
  )
}

export default function WorkspaceLoader({ status, currentStep }: Props) {
  const message = status === 'extracting' ? WORKSPACE.extractingLabel : WORKSPACE.buildingLabel

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 60,
        background: 'rgba(15,15,15,0.95)',
        display: 'grid',
        placeItems: 'center',
        padding: 24,
      }}
    >
      <div
        style={{
          width: 'min(720px, 92vw)',
          transform: 'translateY(0)',
          animation: 'wsFadeUp 200ms ease both',
        }}
      >
        <div style={{ display: 'grid', placeItems: 'center', marginBottom: 18 }}>
          <div className="wsCube" aria-hidden="true">
            <div className="wsFace wsFront" />
            <div className="wsFace wsBack" />
            <div className="wsFace wsRight" />
            <div className="wsFace wsLeft" />
            <div className="wsFace wsTop" />
            <div className="wsFace wsBottom" />
          </div>
        </div>

        <div
          style={{
            color: 'rgba(226,232,240,0.92)',
            fontSize: 12,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            fontWeight: 700,
            marginBottom: 10,
          }}
        >
          {WORKSPACE.buttonLoadingLabel}
        </div>

        <div
          style={{
            border: '1px solid rgba(148,163,184,0.16)',
            borderRadius: 16,
            padding: 14,
            background: 'rgba(2,6,23,0.25)',
          }}
        >
          {WORKSPACE.loadingSteps.map((step, idx) => {
            const isDone = idx < currentStep
            const isCurrent = idx === currentStep
            return (
              <div
                key={step}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '8px 6px',
                  color: isCurrent ? 'rgba(226,232,240,0.95)' : 'rgba(148,163,184,0.8)',
                  fontSize: 13,
                  fontWeight: isCurrent ? 700 : 500,
                }}
              >
                {isDone ? <Check /> : isCurrent ? <Spinner /> : <Dot />}
                <div style={{ flex: 1 }}>{step}</div>
              </div>
            )
          })}
        </div>

        <div
          style={{
            marginTop: 14,
            color: 'rgba(226,232,240,0.86)',
            fontSize: 13,
            fontWeight: 600,
            animation: 'wsPulse 1200ms ease-in-out infinite',
          }}
        >
          {message}
        </div>
        <div style={{ marginTop: 6, color: 'rgba(148,163,184,0.75)', fontSize: 12 }} />
      </div>

      <style jsx>{`
        @keyframes wsSpin {
          to {
            transform: rotate(360deg);
          }
        }
        @keyframes wsFadeUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes wsPulse {
          0%,
          100% {
            opacity: 1;
          }
          50% {
            opacity: 0.6;
          }
        }
        .wsCube {
          width: 64px;
          height: 64px;
          position: relative;
          transform-style: preserve-3d;
          transform: rotateX(-20deg) rotateY(35deg);
          animation: wsCubeSpin 4s linear infinite;
        }
        @keyframes wsCubeSpin {
          0% {
            transform: rotateX(-20deg) rotateY(0deg);
          }
          100% {
            transform: rotateX(-20deg) rotateY(360deg);
          }
        }
        .wsFace {
          position: absolute;
          inset: 0;
          background: rgba(2, 6, 23, 0.35);
          border: 2px solid rgba(99, 102, 241, 0.9);
          box-shadow: 0 0 30px rgba(99, 102, 241, 0.12);
        }
        .wsFront {
          transform: translateZ(32px);
        }
        .wsBack {
          transform: rotateY(180deg) translateZ(32px);
        }
        .wsRight {
          transform: rotateY(90deg) translateZ(32px);
        }
        .wsLeft {
          transform: rotateY(-90deg) translateZ(32px);
        }
        .wsTop {
          transform: rotateX(90deg) translateZ(32px);
        }
        .wsBottom {
          transform: rotateX(-90deg) translateZ(32px);
        }
      `}</style>
    </div>
  )
}
