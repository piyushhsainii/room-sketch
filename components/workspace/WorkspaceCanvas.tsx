'use client'

import { Canvas } from '@react-three/fiber'
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { WORKSPACE } from '@/constants/content'
import {
  getInitialCameraPosition,
  getSceneBounds,
  getSceneWallSegments,
  getWalkStartPosition,
} from '@/lib/workspace/sceneBuilder'
import type { CameraMode, SceneJSON, WorkspaceConfig } from '@/types/workspace'

import CameraController from '@/components/workspace/three/CameraController'
import RoomCeiling from '@/components/workspace/three/RoomCeiling'
import RoomFloor from '@/components/workspace/three/RoomFloor'
import RoomFurniture from '@/components/workspace/three/RoomFurniture'
import RoomLabel from '@/components/workspace/three/RoomLabel'
import RoomWall from '@/components/workspace/three/RoomWall'
import SceneLighting from '@/components/workspace/three/SceneLighting'
import FloorplanMinimap from '@/components/workspace/FloorplanMinimap'
import WorkspaceToolbar from '@/components/workspace/WorkspaceToolbar'
import WorkspaceConfigPanel from './WorkspaceConfigPanel'

type Props = {
  sceneJSON: SceneJSON
  workspaceConfig: WorkspaceConfig
  onConfigChange: (config: WorkspaceConfig) => void
  projectId: string
  onExit: () => void
}

export default function WorkspaceCanvas({
  sceneJSON, workspaceConfig, onConfigChange, projectId, onExit,
}: Props) {
  const canvasWrapperRef = useRef<HTMLDivElement>(null)
  const [mode, setMode] = useState<CameraMode>('orbit')
  const [cameraResetKey, setCameraResetKey] = useState(0)
  const [showHint, setShowHint] = useState(true)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const hintTimer = useRef<number | null>(null)

  const bounds = useMemo(() => getSceneBounds(sceneJSON.rooms), [sceneJSON.rooms])
  const initial = useMemo(() => getInitialCameraPosition(sceneJSON.rooms), [sceneJSON.rooms])
  const walkStart = useMemo(() => getWalkStartPosition(sceneJSON.rooms), [sceneJSON.rooms])
  const sceneWalls = useMemo(() => getSceneWallSegments(sceneJSON.rooms), [sceneJSON.rooms])
  const maxDim = Math.max(bounds.width, bounds.depth, 1)
  const activeStart = mode === 'walk' ? walkStart : initial

  // Apply per-room config overrides to the scene rooms
  const configuredRooms = useMemo(() => {
    return sceneJSON.rooms.map(room => {
      const roomCfg = workspaceConfig.rooms.find(r => r.roomId === room.id)
      if (!roomCfg) return room
      return {
        ...room,
        wall_color: roomCfg.wallColor,
        floor_material: roomCfg.floorMaterial,
      }
    })
  }, [sceneJSON.rooms, workspaceConfig.rooms])

  // Apply per-room config to wall segments
  const configuredWalls = useMemo(() => {
    return sceneWalls.map(seg => {
      const roomCfg = workspaceConfig.rooms.find(r => r.roomId === seg.roomId)
      if (!roomCfg) return seg
      return { ...seg, wallColor: roomCfg.wallColor }
    })
  }, [sceneWalls, workspaceConfig.rooms])

  const hintText = useMemo(() => {
    if (mode === 'topdown') return WORKSPACE.cameraHelp.topDown
    return WORKSPACE.cameraHelp[mode]
  }, [mode])

  const resetHintTimer = useCallback(() => {
    if (hintTimer.current) window.clearTimeout(hintTimer.current)
    hintTimer.current = window.setTimeout(() => setShowHint(false), 4000)
  }, [])

  useEffect(() => {
    resetHintTimer()
    return () => { if (hintTimer.current) window.clearTimeout(hintTimer.current) }
  }, [resetHintTimer])

  const toggleFullscreen = useCallback(async () => {
    if (!document.fullscreenElement) {
      await canvasWrapperRef.current?.requestFullscreen()
      setIsFullscreen(true)
    } else {
      await document.exitFullscreen()
      setIsFullscreen(false)
    }
  }, [])

  useEffect(() => {
    const h = () => setIsFullscreen(Boolean(document.fullscreenElement))
    document.addEventListener('fullscreenchange', h)
    return () => document.removeEventListener('fullscreenchange', h)
  }, [])

  const handleModeChange = useCallback((m: CameraMode) => {
    setMode(m)
    setCameraResetKey((k) => k + 1)
    setShowHint(true)
    resetHintTimer()
  }, [resetHintTimer])

  return (
    <div
      ref={canvasWrapperRef}
      style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden', background: '#1C1A17' }}
    >
      {/* Toolbar */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 48, zIndex: 20 }}>
        <WorkspaceToolbar
          mode={mode}
          onModeChange={handleModeChange}
          onReset={() => setCameraResetKey((k) => k + 1)}
          isFullscreen={isFullscreen}
          onToggleFullscreen={() => void toggleFullscreen()}
          onExit={onExit}
        />
      </div>

      {/* Canvas */}
      <div
        style={{ position: 'absolute', top: 48, left: 0, right: 0, bottom: 0 }}
        onPointerDown={() => { setShowHint(true); resetHintTimer() }}
        onPointerMove={() => { setShowHint(true); resetHintTimer() }}
        onWheel={() => { setShowHint(true); resetHintTimer() }}
      >
        <Canvas
          key={`canvas_${mode}`}
          shadows="soft"
          frameloop="always"
          gl={{ antialias: true, alpha: false, powerPreference: 'high-performance', stencil: false, depth: true }}
          camera={{ fov: mode === 'walk' ? 80 : 55, near: 0.1, far: 1000, position: [activeStart.x, activeStart.y, activeStart.z], up: [0, 1, 0] }}
          dpr={[1, 2]}
          style={{ width: '100%', height: '100%', display: 'block', background: '#1C1814' }}
        >
          <Suspense fallback={null}>
            {/* Fog — toggle via config */}
            {workspaceConfig.fogEnabled && (
              <fog attach="fog" args={['#1C1A17', maxDim * 3, maxDim * 8]} />
            )}

            {/* Lighting — ambient intensity from config */}
            <SceneLighting
              rooms={configuredRooms}
              ambientIntensity={workspaceConfig.ambientIntensity}
            />

            {/* Per-room: floor, ceiling, furniture, label */}
            {configuredRooms.map((room) => (
              <group key={room.id}>
                <RoomFloor room={room} />
                <RoomCeiling room={room} />
                {workspaceConfig.showFurniture && <RoomFurniture room={room} />}
                <RoomLabel
                  room={room}
                  visible={(mode === 'orbit' || mode === 'topdown') && workspaceConfig.showLabels}
                />
              </group>
            ))}

            {/* Walls — with config-driven color + roughness */}
            {configuredWalls.map((seg) => (
              <RoomWall
                key={seg.id}
                segment={seg}
                roomHeight={seg.roomHeight}
                wallColor={seg.wallColor}
                wallRoughness={workspaceConfig.wallRoughness}
                doorStyle={workspaceConfig.doorStyle}   // ← add this
              />
            ))}

            <CameraController
              key={cameraResetKey}
              mode={mode}
              initialPosition={activeStart}
              sceneBounds={bounds}
              rooms={configuredRooms}
            />
          </Suspense>
        </Canvas>
      </div>

      {/* Minimap */}
      <FloorplanMinimap floorplanUrl={sceneJSON.floorplan_url} sceneJSON={sceneJSON} />

      {/* Config panel — sits just above minimap */}
      <WorkspaceConfigPanel
        projectId={projectId}
        rooms={sceneJSON.rooms}
        config={workspaceConfig}
        onConfigChange={onConfigChange}
      />

      {/* Camera hint */}
      <div style={{
        position: 'absolute', left: '50%', bottom: 16,
        transform: 'translateX(-50%)', zIndex: 14,
        padding: '8px 14px', borderRadius: 999,
        background: 'rgba(15,15,15,0.75)',
        color: 'rgba(226,232,240,0.92)', fontSize: 12,
        fontFamily: 'system-ui, sans-serif',
        border: '1px solid rgba(148,163,184,0.16)',
        opacity: showHint ? 1 : 0, transition: 'opacity 200ms ease',
        pointerEvents: 'none', whiteSpace: 'nowrap',
      }}>
        {hintText}
      </div>
    </div>
  )
}