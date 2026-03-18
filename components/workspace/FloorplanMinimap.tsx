'use client'

import { useState } from 'react'

import { getRoomBounds, getSceneBounds } from '@/lib/workspace/sceneBuilder'
import type { SceneJSON } from '@/types/workspace'

type Props = {
  floorplanUrl: string
  sceneJSON: SceneJSON
}

// Procedural SVG minimap drawn from scene geometry
// Used when floorplan_url is empty or fails to load
function ProceduralMinimap({ sceneJSON }: { sceneJSON: SceneJSON }) {
  const bounds = getSceneBounds(sceneJSON.rooms)
  const pad = 1
  const vbX = bounds.minX - pad
  const vbZ = bounds.minZ - pad
  const vbW = bounds.width + pad * 2
  const vbH = bounds.depth + pad * 2

  const FLOOR_COLORS: Record<string, string> = {
    hardwood: '#C8A97A',
    tile: '#D4D0CC',
    carpet: '#B0A8C0',
    concrete: '#9C9C9C',
    marble: '#EDE9E4',
  }

  return (
    <svg
      viewBox={`${vbX} ${vbZ} ${vbW} ${vbH}`}
      style={{ width: '100%', height: '100%' }}
      xmlns="http://www.w3.org/2000/svg"
    >
      {sceneJSON.rooms.map((room) => {
        const b = getRoomBounds(room)
        const fill = FLOOR_COLORS[room.floor_material] ?? '#C8A97A'
        return (
          <g key={room.id}>
            <rect
              x={b.minX}
              y={b.minZ}
              width={b.width}
              height={b.depth}
              fill={fill}
              fillOpacity={0.85}
              stroke={room.wall_color}
              strokeWidth={0.18}
            />
            <text
              x={b.minX + b.width / 2}
              y={b.minZ + b.depth / 2}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={Math.max(0.35, Math.min(b.width, b.depth) * 0.18)}
              fill="rgba(0,0,0,0.6)"
              fontFamily="system-ui, sans-serif"
              fontWeight="600"
            >
              {room.name}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

export default function FloorplanMinimap({ floorplanUrl, sceneJSON }: Props) {
  const [collapsed, setCollapsed] = useState(false)
  const [imgFailed, setImgFailed] = useState(false)

  const showProcedural = !floorplanUrl || imgFailed

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 16,
        left: 16,
        zIndex: 15,
        width: collapsed ? 80 : 160,
        transition: 'width 200ms ease',
        borderRadius: 10,
        overflow: 'hidden',
        border: '1px solid rgba(255,255,255,0.15)',
        boxShadow: '0 4px 24px rgba(0,0,0,0.6)',
        background: 'rgba(20,16,12,0.75)',
        backdropFilter: 'blur(8px)',
      }}
    >
      {/* Header row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '5px 8px 2px',
        }}
      >
        <span
          style={{
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: 'rgba(255,255,255,0.45)',
            fontFamily: 'system-ui, sans-serif',
            whiteSpace: 'nowrap',
          }}
        >
          {collapsed ? '' : 'Floor Plan'}
        </span>
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '0 2px',
            color: 'rgba(255,255,255,0.4)',
            lineHeight: 1,
            fontSize: 12,
          }}
          title={collapsed ? 'Expand minimap' : 'Collapse minimap'}
        >
          {collapsed ? '▶' : '◀'}
        </button>
      </div>

      {/* Map content */}
      {!collapsed && (
        <div
          style={{
            width: '100%',
            aspectRatio: '4/3',
            overflow: 'hidden',
            opacity: 0.9,
            padding: showProcedural ? 4 : 0,
          }}
        >
          {showProcedural ? (
            <ProceduralMinimap sceneJSON={sceneJSON} />
          ) : (
            <img
              src={floorplanUrl}
              alt="Floor plan"
              onError={() => setImgFailed(true)}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                display: 'block',
              }}
            />
          )}
        </div>
      )}
    </div>
  )
}