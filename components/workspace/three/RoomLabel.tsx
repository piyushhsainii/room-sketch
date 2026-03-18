'use client'

import { Html } from '@react-three/drei'

import { getRoomCenter } from '@/lib/workspace/sceneBuilder'
import type { SceneRoom } from '@/types/workspace'

type Props = { room: SceneRoom; visible: boolean }

export default function RoomLabel({ room, visible }: Props) {
  const center = getRoomCenter(room)

  if (!visible) return null

  return (
    <Html
      position={[center.x, 1.5, center.z]}
      center
      occlude
      style={{ pointerEvents: 'none' }}
    >
      <div
        style={{
          background: 'rgba(0,0,0,0.55)',
          backdropFilter: 'blur(6px)',
          color: '#FFFFFF',
          fontSize: 11,
          fontWeight: 600,
          fontFamily: 'system-ui, sans-serif',
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          padding: '3px 9px',
          borderRadius: 99,
          whiteSpace: 'nowrap',
          border: '1px solid rgba(255,255,255,0.15)',
          userSelect: 'none',
        }}
      >
        {room.name}
      </div>
    </Html>
  )
}