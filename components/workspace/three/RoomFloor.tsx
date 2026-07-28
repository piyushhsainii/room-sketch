'use client'

import { Suspense, useMemo } from 'react'
import * as THREE from 'three'
import { useTexture } from '@react-three/drei'

import { getRoomBounds } from '@/lib/workspace/sceneBuilder'
import type { SceneRoom } from '@/types/workspace'

type Props = { room: SceneRoom }

// ── Procedural fallback textures ──────────────────────────────────────────────

function makeHardwoodFallback(): THREE.CanvasTexture {
  const size = 512
  const canvas = document.createElement('canvas')
  canvas.width = size; canvas.height = size
  const ctx = canvas.getContext('2d')!
  const plankH = 52
  const colors = ['#D4C4A0', '#DDD0AE', '#CEBE98', '#D8C8A4', '#D0C29C']
  for (let y = 0; y < size; y += plankH) {
    ctx.fillStyle = colors[Math.floor(y / plankH) % colors.length]!
    ctx.fillRect(0, y, size, plankH - 1)
    ctx.strokeStyle = 'rgba(120,85,40,0.07)'
    ctx.lineWidth = 0.7
    for (let i = 0; i < 10; i++) {
      const gx = (i / 10) * size
      ctx.beginPath()
      ctx.moveTo(gx, y)
      ctx.bezierCurveTo(
        gx + Math.random() * 4 - 2, y + plankH * 0.33,
        gx + Math.random() * 4 - 2, y + plankH * 0.66,
        gx + Math.random() * 2 - 1, y + plankH
      )
      ctx.stroke()
    }
    ctx.fillStyle = 'rgba(90,65,35,0.18)'
    ctx.fillRect(0, y + plankH - 1, size, 1)
  }
  const t = new THREE.CanvasTexture(canvas)
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.needsUpdate = true
  return t
}

function makeMarbleFallback(): THREE.CanvasTexture {
  const size = 512
  const canvas = document.createElement('canvas')
  canvas.width = size; canvas.height = size
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#F0EDE8'; ctx.fillRect(0, 0, size, size)
  const bg = ctx.createLinearGradient(0, 0, size, size)
  bg.addColorStop(0, 'rgba(255,253,250,0.7)')
  bg.addColorStop(1, 'rgba(235,230,224,0.7)')
  ctx.fillStyle = bg; ctx.fillRect(0, 0, size, size)
  function vein(x1: number, y1: number, x2: number, y2: number, a: number, w: number) {
    ctx.strokeStyle = `rgba(175,165,150,${a})`; ctx.lineWidth = w
    ctx.beginPath(); ctx.moveTo(x1, y1)
    ctx.bezierCurveTo(
      x1 + (x2 - x1) * 0.25 + (Math.random() * 50 - 25), y1 + (y2 - y1) * 0.25 + (Math.random() * 50 - 25),
      x1 + (x2 - x1) * 0.75 + (Math.random() * 50 - 25), y1 + (y2 - y1) * 0.75 + (Math.random() * 50 - 25),
      x2, y2)
    ctx.stroke()
  }
  vein(0, size * 0.25, size, size * 0.55, 0.28, 1.8)
  vein(size * 0.15, 0, size * 0.75, size, 0.22, 1.2)
  for (let i = 0; i < 6; i++) vein(Math.random() * size, 0, Math.random() * size, size, 0.09, 0.4)
  const t = new THREE.CanvasTexture(canvas)
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.needsUpdate = true
  return t
}

function makeTileFallback(): THREE.CanvasTexture {
  const size = 512
  const canvas = document.createElement('canvas')
  canvas.width = size; canvas.height = size
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#E8E4DE'; ctx.fillRect(0, 0, size, size)
  const ts = 80, gw = 3
  for (let ty = 0; ty < size; ty += ts) {
    for (let tx = 0; tx < size; tx += ts) {
      const v = Math.random() * 8 - 4
      const b = Math.round(232 + v)
      ctx.fillStyle = `rgb(${b},${b - 2},${b - 5})`
      ctx.fillRect(tx + gw, ty + gw, ts - gw * 2, ts - gw * 2)
    }
  }
  ctx.fillStyle = '#D0CBC4'
  for (let ty = 0; ty < size; ty += ts) ctx.fillRect(0, ty, size, gw)
  for (let tx = 0; tx < size; tx += ts) ctx.fillRect(tx, 0, gw, size)
  const t = new THREE.CanvasTexture(canvas)
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.needsUpdate = true
  return t
}

export function makeWallNormalTexture(): THREE.CanvasTexture {
  const size = 256
  const canvas = document.createElement('canvas')
  canvas.width = size; canvas.height = size
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#8080FF'; ctx.fillRect(0, 0, size, size)
  for (let i = 0; i < 800; i++) {
    const x = Math.random() * size; const y = Math.random() * size
    const r = Math.random() * 3 + 0.5
    const nx = Math.round(128 + (Math.random() * 14 - 7))
    const ny = Math.round(128 + (Math.random() * 14 - 7))
    ctx.fillStyle = `rgb(${nx},${ny},255)`
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill()
  }
  const t = new THREE.CanvasTexture(canvas)
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.repeat.set(4, 4); t.needsUpdate = true
  return t
}

// ── PBR texture paths (local /public/textures/) ───────────────────────────────

const TEXTURE_URLS = {
  hardwood: {
    map: '/textures/Wood049_1K-JPG_Color.jpg',
    normalMap: '/textures/Wood049_1K-JPG_NormalGL.jpg',
    roughnessMap: '/textures/Wood049_1K-JPG_Roughness.jpg',
  },
  marble: {
    map: '/textures/Marble022_1K-JPG_Color.jpg',
    normalMap: '/textures/Marble022_1K-JPG_NormalGL.jpg',
    roughnessMap: '/textures/Marble022_1K-JPG_Roughness.jpg',
  },
  tile: {
    map: '/textures/Tiles101_1K-JPG_Color.jpg',
    normalMap: '/textures/Tiles101_1K-JPG_NormalGL.jpg',
    roughnessMap: '/textures/Tiles101_Roughness.jpg',
  },
  carpet: {
    map: '/textures/Fabric049_1K-JPG_Color.jpg',
    normalMap: '/textures/Fabric049_1K-JPG_NormalGL.jpg',
    roughnessMap: '/textures/Fabric049_1K-JPG_Roughness.jpg',
  },
  concrete: {
    map: '/textures/Concrete025_1K-JPG_Color.jpg',
    normalMap: '/textures/Concrete025_1K-JPG_NormalGL.jpg',
    roughnessMap: '/textures/Concrete025_1K-JPG_Roughness.jpg',
  },
} as const

const FLOOR_PBR_CONFIG: Record<SceneRoom['floor_material'], {
  roughness: number; metalness: number; repeat: number
}> = {
  // solid colors
  'plain': { roughness: 0.85, metalness: 0.0, repeat: 1.0 },
  'solid-white': { roughness: 0.80, metalness: 0.0, repeat: 1.0 },
  'solid-gray': { roughness: 0.80, metalness: 0.0, repeat: 1.0 },
  'solid-black': { roughness: 0.75, metalness: 0.0, repeat: 1.0 },
  'solid-beige': { roughness: 0.80, metalness: 0.0, repeat: 1.0 },

  // wood
  'wood': { roughness: 0.72, metalness: 0.0, repeat: 2.0 },
  'wood-oak': { roughness: 0.68, metalness: 0.0, repeat: 2.0 },
  'wood-walnut': { roughness: 0.65, metalness: 0.0, repeat: 2.0 },
  'wood-floor-herringbone': { roughness: 0.70, metalness: 0.0, repeat: 3.0 },

  // marble
  'marble': { roughness: 0.18, metalness: 0.04, repeat: 1.0 },
  'marble-white': { roughness: 0.15, metalness: 0.04, repeat: 1.0 },
  'marble-black': { roughness: 0.20, metalness: 0.05, repeat: 1.0 },
  'marble-onyx': { roughness: 0.22, metalness: 0.05, repeat: 1.0 },
  'marble-travertine': { roughness: 0.35, metalness: 0.02, repeat: 1.5 },
  'marble-white-veined': { roughness: 0.16, metalness: 0.04, repeat: 1.0 },

  // concrete / tile
  'concrete': { roughness: 0.90, metalness: 0.0, repeat: 1.5 },
  'concrete-polished': { roughness: 0.40, metalness: 0.02, repeat: 1.5 },
  'tiles': { roughness: 0.30, metalness: 0.04, repeat: 2.0 },
  'tile-ceramic': { roughness: 0.25, metalness: 0.03, repeat: 2.0 },

  // brick
  'brick-red': { roughness: 0.80, metalness: 0.0, repeat: 3.0 },
  'brick-white': { roughness: 0.78, metalness: 0.0, repeat: 3.0 },

  // fabric / carpet
  'fabric': { roughness: 0.95, metalness: 0.0, repeat: 2.5 },
  'fabric-fine-weave': { roughness: 0.92, metalness: 0.0, repeat: 2.5 },
  'carpet-plush': { roughness: 0.98, metalness: 0.0, repeat: 3.0 },
  'carpet-woven': { roughness: 0.96, metalness: 0.0, repeat: 3.0 },

  // plaster
  'plaster': { roughness: 0.85, metalness: 0.0, repeat: 1.0 },
}

// ── PBR floor material ────────────────────────────────────────────────────────

function FloorMaterialPBR({ material, roughness, metalness, repeat }: {
  material: SceneRoom['floor_material']
  roughness: number
  metalness: number
  repeat: number
}) {
  // @ts-ignore
  const urls = TEXTURE_URLS[material]
  const textures = useTexture({
    map: urls.map,
    normalMap: urls.normalMap,
    roughnessMap: urls.roughnessMap,
  })

  useMemo(() => {
    const maps = [textures.map, textures.normalMap, textures.roughnessMap]
    maps.forEach((t) => {
      if (t) {
        t.wrapS = t.wrapT = THREE.RepeatWrapping
        t.repeat.set(repeat, repeat)
        t.needsUpdate = true
      }
    })
  }, [textures, repeat])

  return (
    <meshStandardMaterial
      map={textures.map}
      normalMap={textures.normalMap}
      roughnessMap={textures.roughnessMap}
      roughness={roughness}
      metalness={metalness}
      side={THREE.DoubleSide}   // ← render both faces
    />
  )
}

function FloorMaterialFallback({ material, roughness, metalness }: {
  material: SceneRoom['floor_material']
  roughness: number
  metalness: number
}) {
  const texture = useMemo(() => {
    if (typeof document === 'undefined') return null
    if (material === 'marble') return makeMarbleFallback()
    if (material === 'tiles') return makeTileFallback()
    return makeHardwoodFallback()
  }, [material])

  return (
    <meshStandardMaterial
      map={texture ?? undefined}
      roughness={roughness}
      metalness={metalness}
      color="#FFFFFF"
      side={THREE.DoubleSide}   // ← render both faces
    />
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function RoomFloor({ room }: Props) {
  const bounds = useMemo(() => getRoomBounds(room), [room])
  const config = FLOOR_PBR_CONFIG[room.floor_material] ?? FLOOR_PBR_CONFIG.wood

  const centerX = bounds.minX + bounds.width / 2
  const centerZ = bounds.minZ + bounds.depth / 2

  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[centerX, 0.01, centerZ]}
      receiveShadow
    >
      <planeGeometry args={[bounds.width, bounds.depth]} />
      <Suspense fallback={
        <FloorMaterialFallback
          material={room.floor_material}
          roughness={config.roughness}
          metalness={config.metalness}
        />
      }>
        <FloorMaterialPBR
          material={room.floor_material}
          roughness={config.roughness}
          metalness={config.metalness}
          repeat={config.repeat}
        />
      </Suspense>
    </mesh>
  )
}