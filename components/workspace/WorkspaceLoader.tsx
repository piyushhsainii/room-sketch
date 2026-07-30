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
      className="inline-block w-3 h-3 rounded-full border-2"
      style={{
        borderColor: 'rgba(91,127,214,0.25)',
        borderTopColor: '#5B7FD6',
        animation: 'wsSpin 900ms linear infinite',
      }}
      aria-hidden="true"
    />
  )
}

function Check() {
  return (
    <span
      className="inline-grid place-items-center w-3 h-3 rounded-full text-white"
      style={{ background: '#3D9A5C', fontSize: 9, lineHeight: 1 }}
      aria-hidden="true"
    >
      ✓
    </span>
  )
}

function Dot() {
  return (
    <span
      className="inline-block w-[9px] h-[9px] rounded-full"
      style={{ background: 'rgba(247,246,241,0.25)' }}
      aria-hidden="true"
    />
  )
}

export default function WorkspaceLoader({ status, currentStep }: Props) {
  const message = status === 'extracting' ? WORKSPACE.extractingLabel : WORKSPACE.buildingLabel

  return (
    <div
      className="fixed inset-0 z-[60] grid place-items-center p-6"
      style={{ background: 'rgba(18,33,62,0.97)' }}
    >
      <div
        className="w-[min(560px,92vw)]"
        style={{ animation: 'wsFadeUp 200ms ease both' }}
      >
        <div className="grid place-items-center mb-5">
          <div className="wsCube" aria-hidden="true">
            <div className="wsFace wsFront" />
            <div className="wsFace wsBack" />
            <div className="wsFace wsRight" />
            <div className="wsFace wsLeft" />
            <div className="wsFace wsTop" />
            <div className="wsFace wsBottom" />
          </div>
        </div>

        <div className="font-mono text-[11px] font-medium tracking-[0.14em] uppercase text-center mb-4 text-blue-dim">
          {WORKSPACE.buttonLoadingLabel}
        </div>

        <div
          className="rounded-[10px] p-3.5"
          style={{
            border: '1px solid rgba(247,246,241,0.12)',
            background: 'rgba(9,16,32,0.4)',
          }}
        >
          {WORKSPACE.loadingSteps.map((step, idx) => {
            const isDone = idx < currentStep
            const isCurrent = idx === currentStep
            return (
              <div
                key={step}
                className="flex items-center gap-2.5 py-2 px-1.5 text-[13px]"
                style={{
                  color: isCurrent ? 'rgba(247,246,241,0.95)' : 'rgba(247,246,241,0.5)',
                  fontWeight: isCurrent ? 600 : 400,
                }}
              >
                {isDone ? <Check /> : isCurrent ? <Spinner /> : <Dot />}
                <div className="flex-1 font-light tracking-[-0.005em]">{step}</div>
              </div>
            )
          })}
        </div>

        <div
          className="mt-3.5 text-center font-mono text-[12px] text-paper/80"
          style={{ animation: 'wsPulse 1200ms ease-in-out infinite' }}
        >
          {message}
        </div>
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
            opacity: 0.55;
          }
        }
        .wsCube {
          width: 56px;
          height: 56px;
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
          background: rgba(91, 127, 214, 0.08);
          border: 1.5px solid rgba(91, 127, 214, 0.85);
          box-shadow: 0 0 24px rgba(91, 127, 214, 0.15);
        }
        .wsFront {
          transform: translateZ(28px);
        }
        .wsBack {
          transform: rotateY(180deg) translateZ(28px);
        }
        .wsRight {
          transform: rotateY(90deg) translateZ(28px);
        }
        .wsLeft {
          transform: rotateY(-90deg) translateZ(28px);
        }
        .wsTop {
          transform: rotateX(90deg) translateZ(28px);
        }
        .wsBottom {
          transform: rotateX(-90deg) translateZ(28px);
        }
      `}</style>
    </div>
  )
}