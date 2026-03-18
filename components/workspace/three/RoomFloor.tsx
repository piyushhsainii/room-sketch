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
  hardwood: { roughness: 0.72, metalness: 0.0, repeat: 2.0 },
  marble: { roughness: 0.18, metalness: 0.04, repeat: 1.0 },
  tile: { roughness: 0.30, metalness: 0.04, repeat: 2.0 },
  carpet: { roughness: 0.97, metalness: 0.0, repeat: 3.0 },
  concrete: { roughness: 0.90, metalness: 0.0, repeat: 1.5 },
}

// ── KEY FIX: build shape in LOCAL space (origin at room minX, minZ) ───────────
// ShapeGeometry generates UVs from the shape's coordinate range.
// If the shape is in world space (e.g. x=9..14), UVs start at 9 not 0,
// causing the texture to appear offset by 9 meters.
// Solution: shift all shape points so the room starts at (0,0),
// then position the mesh at (minX, 0, minZ) to restore world position.

function buildLocalShape(room: SceneRoom, bounds: ReturnType<typeof getRoomBounds>): THREE.Shape {
  const s = new THREE.Shape()
  const pts = room.shape
  if (pts.length === 0) return s
  // Subtract minX/minZ from every point → shape is in [0..width] x [0..depth]
  s.moveTo(pts[0]!.x - bounds.minX, pts[0]!.z - bounds.minZ)
  for (let i = 1; i < pts.length; i++) {
    s.lineTo(pts[i]!.x - bounds.minX, pts[i]!.z - bounds.minZ)
  }
  s.closePath()
  return s
}

// ── PBR floor material ────────────────────────────────────────────────────────

function FloorMaterialPBR({ material, roughness, metalness, repeat }: {
  material: SceneRoom['floor_material']
  roughness: number
  metalness: number
  repeat: number
}) {
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
    if (material === 'tile') return makeTileFallback()
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
  const config = FLOOR_PBR_CONFIG[room.floor_material] ?? FLOOR_PBR_CONFIG.hardwood

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