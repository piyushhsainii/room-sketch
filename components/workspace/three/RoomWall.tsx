'use client'

import { Suspense, useMemo } from 'react'
import * as THREE from 'three'
import { useTexture } from '@react-three/drei'

import { makeWallNormalTexture } from '@/components/workspace/three/RoomFloor'
import type { DoorStyle, RoomDoor } from '@/types/workspace'
import type { WallSegment } from '@/lib/workspace/sceneBuilder'

type Props = {
  segment: WallSegment
  roomHeight: number
  wallColor: string
  wallRoughness?: number
  doorStyle?: DoorStyle
}

const THICKNESS = 0.15
const DOOR_HEIGHT = 2.1

// ── Door material configs ─────────────────────────────────────────────────────

interface DoorMatConfig {
  color: string
  roughness: number
  metalness: number
  transparent: boolean
  opacity: number
  textureKey: 'wood_oak' | 'wood_dark' | 'metal' | null
}

const DOOR_MAT_CONFIGS: Record<DoorStyle, DoorMatConfig> = {
  wood_oak: {
    color: '#C8A878',
    roughness: 0.55,
    metalness: 0.02,
    transparent: false,
    opacity: 1.0,
    textureKey: 'wood_oak',
  },
  wood_dark: {
    color: '#4A3220',
    roughness: 0.60,
    metalness: 0.02,
    transparent: false,
    opacity: 1.0,
    textureKey: 'wood_dark',
  },
  wood_white: {
    color: '#F0EDE8',
    roughness: 0.75,
    metalness: 0.0,
    transparent: false,
    opacity: 1.0,
    textureKey: null,
  },
  glass_frosted: {
    color: '#C8D8E4',
    roughness: 0.35,
    metalness: 0.08,
    transparent: true,
    opacity: 0.55,
    textureKey: null,
  },
  glass_clear: {
    color: '#B8D0E0',
    roughness: 0.05,
    metalness: 0.12,
    transparent: true,
    opacity: 0.25,
    textureKey: null,
  },
  metal_steel: {
    color: '#9AABB8',
    roughness: 0.22,
    metalness: 0.85,
    transparent: false,
    opacity: 1.0,
    textureKey: 'metal',
  },
  panel_white: {
    color: '#F5F2EE',
    roughness: 0.70,
    metalness: 0.0,
    transparent: false,
    opacity: 1.0,
    textureKey: null,
  },
}

// ── Door material components ──────────────────────────────────────────────────

function DoorMaterialTextured({ style }: { style: DoorStyle }) {
  const cfg = DOOR_MAT_CONFIGS[style]

  // Only wood_oak uses the existing Wood049 textures
  // wood_dark reuses same texture with dark color tint
  // metal_steel uses Concrete025 roughness as a stand-in normal variation
  const woodUrls = {
    map: '/textures/Wood049_1K-JPG_Color.jpg',
    normalMap: '/textures/Wood049_1K-JPG_NormalGL.jpg',
    roughnessMap: '/textures/Wood049_1K-JPG_Roughness.jpg',
  }
  const metalUrls = {
    normalMap: '/textures/Plaster001_1K-JPG_NormalGL.jpg',
    roughnessMap: '/textures/Plaster001_1K-JPG_Roughness.jpg',
  }

  if (cfg.textureKey === 'wood_oak' || cfg.textureKey === 'wood_dark') {
    return <DoorMaterialWood style={style} urls={woodUrls} />
  }
  if (cfg.textureKey === 'metal') {
    return <DoorMaterialMetal urls={metalUrls} />
  }
  // Fallback for non-textured styles
  return (
    <meshStandardMaterial
      color={cfg.color}
      roughness={cfg.roughness}
      metalness={cfg.metalness}
      transparent={cfg.transparent}
      opacity={cfg.opacity}
    />
  )
}

function DoorMaterialWood({
  style,
  urls,
}: {
  style: DoorStyle
  urls: { map: string; normalMap: string; roughnessMap: string }
}) {
  const cfg = DOOR_MAT_CONFIGS[style]
  const textures = useTexture(urls)
  useMemo(() => {
    Object.values(textures).forEach((t) => {
      if (t) {
        t.wrapS = t.wrapT = THREE.RepeatWrapping
        t.repeat.set(1, 2.2)
        t.needsUpdate = true
      }
    })
  }, [textures])
  return (
    <meshStandardMaterial
      map={textures.map}
      normalMap={textures.normalMap}
      roughnessMap={textures.roughnessMap}
      color={cfg.color}
      roughness={cfg.roughness}
      metalness={cfg.metalness}
    />
  )
}

function DoorMaterialMetal({
  urls,
}: {
  urls: { normalMap: string; roughnessMap: string }
}) {
  const cfg = DOOR_MAT_CONFIGS['metal_steel']
  const textures = useTexture(urls)
  useMemo(() => {
    Object.values(textures).forEach((t) => {
      if (t) {
        t.wrapS = t.wrapT = THREE.RepeatWrapping
        t.repeat.set(2, 3)
        t.needsUpdate = true
      }
    })
  }, [textures])
  return (
    <meshStandardMaterial
      normalMap={textures.normalMap}
      roughnessMap={textures.roughnessMap}
      color={cfg.color}
      roughness={cfg.roughness}
      metalness={cfg.metalness}
    />
  )
}

// Door frame (thin surround strip on the wall face)
function DoorFrame({
  w, h, rotY,
}: { w: number; h: number; rotY: number }) {
  const frameT = 0.04
  const frameD = 0.06
  return (
    <group rotation={[0, rotY, 0]}>
      {/* Left jamb */}
      <mesh position={[-(w / 2 + frameT / 2), h / 2, 0]}>
        <boxGeometry args={[frameT, h, frameD]} />
        <meshStandardMaterial color="#D0C8B8" roughness={0.6} metalness={0.05} />
      </mesh>
      {/* Right jamb */}
      <mesh position={[(w / 2 + frameT / 2), h / 2, 0]}>
        <boxGeometry args={[frameT, h, frameD]} />
        <meshStandardMaterial color="#D0C8B8" roughness={0.6} metalness={0.05} />
      </mesh>
      {/* Top header */}
      <mesh position={[0, h + frameT / 2, 0]}>
        <boxGeometry args={[w + frameT * 2, frameT, frameD]} />
        <meshStandardMaterial color="#D0C8B8" roughness={0.6} metalness={0.05} />
      </mesh>
    </group>
  )
}

// Door handle
function DoorHandle({ style }: { style: DoorStyle }) {
  const isGlass = style === 'glass_clear' || style === 'glass_frosted'
  const isMetal = style === 'metal_steel'
  const color = isMetal ? '#C0C8D0' : isGlass ? '#A0B0B8' : '#8B7355'
  const metal = isMetal || isGlass ? 0.8 : 0.1
  const rough = isMetal ? 0.15 : isGlass ? 0.1 : 0.5

  return (
    <group position={[0.35, 0, 0.025]}>
      {/* Handle bar */}
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.018, 0.018, 0.12, 10]} />
        <meshStandardMaterial color={color} roughness={rough} metalness={metal} />
      </mesh>
      {/* Back plate */}
      <mesh position={[0, 0, -0.015]}>
        <boxGeometry args={[0.035, 0.14, 0.012]} />
        <meshStandardMaterial color={color} roughness={rough} metalness={metal} />
      </mesh>
    </group>
  )
}

// ── Wall material helpers (unchanged from before) ─────────────────────────────

function classifyWallColor(hex: string): 'plaster' | 'marble' | 'tile' {
  if (!hex || hex.length < 7) return 'plaster'
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  if (b > r && b - r > 5 && g > r) return 'tile'
  if (r > 235 && g > 235 && b > 235) return 'marble'
  return 'plaster'
}

const WALL_TEXTURE_URLS = {
  plaster: {
    normalMap: '/textures/Plaster001_1K-JPG_NormalGL.jpg',
    roughnessMap: '/textures/Plaster001_1K-JPG_Roughness.jpg',
  },
  marble: {
    normalMap: '/textures/Marble022_1K-JPG_NormalGL.jpg',
    roughnessMap: '/textures/Marble022_1K-JPG_Roughness.jpg',
  },
  tile: {
    normalMap: '/textures/Tiles101_1K-JPG_NormalGL.jpg',
    roughnessMap: '/textures/Tiles101_Roughness.jpg',
  },
}

function WallMaterialPBR({ color, wallType, roughness }: {
  color: string
  wallType: 'plaster' | 'marble' | 'tile'
  roughness: number
}) {
  const urls = WALL_TEXTURE_URLS[wallType]
  const textures = useTexture(urls)
  useMemo(() => {
    Object.values(textures).forEach((t) => {
      if (t) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(2, 2); t.needsUpdate = true }
    })
  }, [textures])
  return (
    <meshStandardMaterial
      color={color}
      roughness={roughness}
      metalness={wallType === 'marble' ? 0.04 : 0.0}
      normalMap={textures.normalMap}
      normalScale={new THREE.Vector2(wallType === 'tile' ? 0.6 : 0.4, wallType === 'tile' ? 0.6 : 0.4)}
      roughnessMap={textures.roughnessMap}
    />
  )
}

function WallMaterialFallback({ color, roughness, normalMap }: {
  color: string
  roughness: number
  normalMap: THREE.CanvasTexture | null
}) {
  return (
    <meshStandardMaterial
      color={color}
      roughness={roughness}
      metalness={0.0}
      normalMap={normalMap ?? undefined}
      normalScale={new THREE.Vector2(0.4, 0.4)}
    />
  )
}

function WallPanel({
  cx, cy, cz, w, h, rotY, color, wallType, wallRoughness, normalMapFallback,
}: {
  cx: number; cy: number; cz: number
  w: number; h: number; rotY: number
  color: string
  wallType: 'plaster' | 'marble' | 'tile'
  wallRoughness: number
  normalMapFallback: THREE.CanvasTexture | null
}) {
  if (w <= 0.02 || h <= 0.02) return null
  return (
    <mesh position={[cx, cy, cz]} rotation={[0, rotY, 0]} castShadow receiveShadow>
      <boxGeometry args={[w, h, THICKNESS]} />
      <Suspense fallback={
        <WallMaterialFallback color={color} roughness={wallRoughness} normalMap={normalMapFallback} />
      }>
        <WallMaterialPBR color={color} wallType={wallType} roughness={wallRoughness} />
      </Suspense>
    </mesh>
  )
}

// ── Direction helpers ─────────────────────────────────────────────────────────

function normalForDirection(dir: WallSegment['direction']): { x: number; z: number } {
  if (dir === 'north') return { x: 0, z: -1 }
  if (dir === 'south') return { x: 0, z: 1 }
  if (dir === 'east') return { x: 1, z: 0 }
  return { x: -1, z: 0 }
}

// ── Main export ───────────────────────────────────────────────────────────────

export default function RoomWall({
  segment,
  roomHeight,
  wallColor,
  wallRoughness = 0.82,
  doorStyle = 'wood_oak',
}: Props) {
  const rotY = segment.direction === 'north' || segment.direction === 'south' ? 0 : Math.PI / 2
  const normal = normalForDirection(segment.direction)

  const minX = Math.min(segment.start.x, segment.end.x)
  const maxX = Math.max(segment.start.x, segment.end.x)
  const minZ = Math.min(segment.start.z, segment.end.z)
  const maxZ = Math.max(segment.start.z, segment.end.z)

  const isHorizontal = segment.direction === 'north' || segment.direction === 'south'
  const wallFixed = isHorizontal
    ? (segment.direction === 'north' ? minZ : maxZ)
    : (segment.direction === 'west' ? minX : maxX)
  const wallStart = isHorizontal ? minX : minZ
  const wallEnd = isHorizontal ? maxX : maxZ
  const hasDoors = segment.doors.length > 0
  const wallType = classifyWallColor(wallColor)

  const normalMapFallback = useMemo(() => {
    if (typeof document === 'undefined') return null
    return makeWallNormalTexture()
  }, [])

  const sharedWallProps = { color: wallColor, wallType, wallRoughness, normalMapFallback }

  function pos(along: number) {
    return isHorizontal
      ? { cx: along, cz: wallFixed }
      : { cx: wallFixed, cz: along }
  }

  function buildPanels(door: RoomDoor) {
    const panels: React.ReactNode[] = []
    const doorWorldCenter = wallStart + door.position
    const doorWorldLeft = Math.max(wallStart, doorWorldCenter - door.width / 2)
    const doorWorldRight = Math.min(wallEnd, doorWorldCenter + door.width / 2)
    const actualDoorW = doorWorldRight - doorWorldLeft

    // Left panel
    const leftLen = doorWorldLeft - wallStart
    if (leftLen > 0.02) {
      const mid = wallStart + leftLen / 2
      panels.push(
        <WallPanel key="L"
          cx={pos(mid).cx} cy={roomHeight / 2} cz={pos(mid).cz}
          w={leftLen} h={roomHeight} rotY={rotY}
          {...sharedWallProps}
        />
      )
    }

    // Right panel
    const rightLen = wallEnd - doorWorldRight
    if (rightLen > 0.02) {
      const mid = doorWorldRight + rightLen / 2
      panels.push(
        <WallPanel key="R"
          cx={pos(mid).cx} cy={roomHeight / 2} cz={pos(mid).cz}
          w={rightLen} h={roomHeight} rotY={rotY}
          {...sharedWallProps}
        />
      )
    }

    // Header above door
    const headerH = roomHeight - DOOR_HEIGHT
    if (headerH > 0.02) {
      const mid = doorWorldLeft + actualDoorW / 2
      panels.push(
        <WallPanel key="H"
          cx={pos(mid).cx} cy={DOOR_HEIGHT + headerH / 2} cz={pos(mid).cz}
          w={actualDoorW} h={headerH} rotY={rotY}
          {...sharedWallProps}
        />
      )
    }

    // ── Door frame ────────────────────────────────────────────────────────────
    const frameMid = doorWorldLeft + actualDoorW / 2
    const frameInset = THICKNESS / 2 + 0.01
    const frameCx = isHorizontal ? frameMid : wallFixed + normal.x * frameInset
    const frameCz = isHorizontal ? wallFixed + normal.z * frameInset : frameMid
    panels.push(
      <group key="frame" position={[frameCx, 0, frameCz]}>
        <DoorFrame w={actualDoorW} h={DOOR_HEIGHT} rotY={rotY} />
      </group>
    )

    // ── Door leaf: open ~85° inward ───────────────────────────────────────────
    // Hinge at left edge of opening, leaf swings inward
    // ── Door leaf: open 90°, hinged at left edge, swings INWARD ──────────────
    const hingeAlong = doorWorldLeft
    const leafInset = THICKNESS / 2 + 0.025

    // Inward = opposite of wall normal
    const inwardX = -normal.x
    const inwardZ = -normal.z

    const leafInwardCenter = leafInset + door.width / 2

    const leafCx = isHorizontal
      ? hingeAlong + leafInset * Math.abs(inwardX)
      : wallFixed + inwardX * leafInwardCenter
    const leafCz = isHorizontal
      ? wallFixed + inwardZ * leafInwardCenter
      : hingeAlong + leafInset * Math.abs(inwardZ)   // stays near hinge Z

    panels.push(
      <group key="leaf" position={[leafCx, DOOR_HEIGHT / 2, leafCz]}>
        <mesh rotation={[0, rotY + Math.PI / 2, 0]} castShadow receiveShadow>
          <boxGeometry args={[door.width, DOOR_HEIGHT, 0.045]} />
          <Suspense fallback={
            <meshStandardMaterial
              color={DOOR_MAT_CONFIGS[doorStyle].color}
              roughness={DOOR_MAT_CONFIGS[doorStyle].roughness}
              metalness={DOOR_MAT_CONFIGS[doorStyle].metalness}
              transparent={DOOR_MAT_CONFIGS[doorStyle].transparent}
              opacity={DOOR_MAT_CONFIGS[doorStyle].opacity}
            />
          }>
            <DoorMaterialTextured style={doorStyle} />
          </Suspense>
        </mesh>
        {/* Handle */}
        <group rotation={[0, rotY + Math.PI / 2, 0]}>
          <DoorHandle style={doorStyle} />
        </group>
      </group>
    )

    return panels
  }

  return (
    <group>
      {hasDoors
        ? buildPanels(segment.doors[0]!)
        : (
          <WallPanel
            cx={(minX + maxX) / 2} cy={roomHeight / 2} cz={(minZ + maxZ) / 2}
            w={segment.length} h={roomHeight} rotY={rotY}
            {...sharedWallProps}
          />
        )
      }

      {segment.windows.map((w, idx) => {
        const wh = w.height > 0 ? w.height : 1.2
        const sill = w.sillHeight >= 0 ? w.sillHeight : 0.9
        const winWorldCenter = wallStart + w.position
        const ox = normal.x * (THICKNESS / 2 + 0.012)
        const oz = normal.z * (THICKNESS / 2 + 0.012)
        const px = isHorizontal ? winWorldCenter + ox : wallFixed + ox
        const pz = isHorizontal ? wallFixed + oz : winWorldCenter + oz
        return (
          <mesh key={`win_${idx}`} position={[px, sill + wh / 2, pz]} rotation={[0, rotY, 0]}>
            <boxGeometry args={[w.width, wh, 0.03]} />
            <meshStandardMaterial color="#C8DDE8" transparent opacity={0.52} roughness={0.08} metalness={0.15} />
          </mesh>
        )
      })}
    </group>
  )
}