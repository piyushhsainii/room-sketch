'use client'

import { useMemo } from 'react'

import { getRoomBounds, getRoomCenter, getSceneBounds } from '@/lib/workspace/sceneBuilder'
import type { SceneRoom } from '@/types/workspace'

type Props = {
  rooms: SceneRoom[],
  ambientIntensity?: number
}

export default function SceneLighting({ rooms, ambientIntensity = 2.5 }: Props) {
  const bounds = useMemo(() => getSceneBounds(rooms), [rooms])
  const maxDim = Math.max(bounds.width, bounds.depth, 1)
  const { centerX, centerZ } = bounds

  return (
    <group>
      {/* High ambient — this floor plan is bright and airy */}
      <ambientLight intensity={ambientIntensity} color="#FFF9F2" />

      {/* Primary overhead sun — very high so it floods down evenly */}
      <directionalLight
        color="#FFF5E8"
        intensity={2.5}
        position={[centerX + maxDim * 0.5, maxDim * 2.5, centerZ - maxDim * 0.3]}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-bias={-0.0004}
        shadow-camera-near={0.1}
        shadow-camera-far={maxDim * 7}
        shadow-camera-left={-maxDim * 3}
        shadow-camera-right={maxDim * 3}
        shadow-camera-top={maxDim * 3}
        shadow-camera-bottom={-maxDim * 3}
      />

      {/* Secondary fill — cool-white from the opposite side */}
      <directionalLight
        color="#E8F0FF"
        intensity={1.2}
        position={[centerX - maxDim, maxDim * 1.5, centerZ + maxDim]}
      />

      {/* Front fill — eye-level for walk mode */}
      <directionalLight
        color="#FFF8F0"
        intensity={1.0}
        position={[centerX, maxDim * 0.4, centerZ + maxDim * 2.5]}
      />

      {/* Low rear fill — prevents any wall from going fully dark */}
      <directionalLight
        color="#F8F0E8"
        intensity={0.7}
        position={[centerX, 1.2, centerZ - maxDim * 2.5]}
      />

      {/* Per-room warm ceiling point lights */}
      {rooms.map((room) => {
        const c = getRoomCenter(room)
        const b = getRoomBounds(room)
        const diag = Math.sqrt(b.width * b.width + b.depth * b.depth)
        const dist = Math.max(diag * 2.0, 8)
        return (
          <pointLight
            key={`pl_${room.id}`}
            position={[c.x, room.height * 0.9, c.z]}
            intensity={2.5}
            distance={dist}
            decay={0.8}
            color="#FFF8F0"
          />
        )
      })}
    </group>
  )
}