'use client'

import { useMemo } from 'react'
import * as THREE from 'three'

import type { SceneRoom } from '@/types/workspace'

type Props = { room: SceneRoom }

export default function RoomCeiling({ room }: Props) {
  const shape = useMemo(() => {
    const pts = room.shape
    const s = new THREE.Shape()
    if (pts.length > 0) {
      s.moveTo(pts[0]!.x, pts[0]!.z)
      for (let i = 1; i < pts.length; i++) s.lineTo(pts[i]!.x, pts[i]!.z)
      s.closePath()
    }
    return s
  }, [room.shape])

  return (
    // Rendered with BackSide so it's visible looking up from inside
    // y = room.height - 0.001 to avoid z-fighting with walls
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, room.height - 0.001, 0]}
      receiveShadow
    >
      <shapeGeometry args={[shape]} />
      <meshStandardMaterial
        color="#F5F2EE"
        roughness={0.9}
        metalness={0.0}
        side={THREE.BackSide}
      />
    </mesh>
  )
}