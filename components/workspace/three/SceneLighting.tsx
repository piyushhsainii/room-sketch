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

  // Shadow frustum sized to actual scene extent + small margin,
  // instead of a flat maxDim*3 multiplier that over/under-fits depending on room count.
  const shadowMargin = 1.15
  const shadowHalfWidth = (bounds.width / 2) * shadowMargin
  const shadowHalfDepth = (bounds.depth / 2) * shadowMargin
  const shadowExtent = Math.max(shadowHalfWidth, shadowHalfDepth, 4)

  return (
    <group>
      {/* Hemisphere light — sky color from above, ground-bounce color from below.
          Replaces flat ambient so unlit areas read as "in shade" rather than uniformly grey. */}
      <hemisphereLight
        color="#CFE0F5"
        groundColor="#8A7A64"
        intensity={ambientIntensity * 0.5}
      />

      {/* Low flat ambient kept as a small base so nothing goes fully black in tight corners */}
      <ambientLight intensity={ambientIntensity * 0.15} color="#FFF9F2" />

      {/* Primary overhead sun — very high so it floods down evenly */}
      <directionalLight
        color="#FFF5E8"
        intensity={2.5}
        position={[centerX + maxDim * 0.5, maxDim * 2.5, centerZ - maxDim * 0.3]}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-bias={-0.0003}
        shadow-normalBias={0.02}
        shadow-camera-near={0.1}
        shadow-camera-far={maxDim * 5}
        shadow-camera-left={-shadowExtent}
        shadow-camera-right={shadowExtent}
        shadow-camera-top={shadowExtent}
        shadow-camera-bottom={-shadowExtent}
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