'use client'

import { OrbitControls } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'

import type { CameraMode, SceneRoom, WallPoint } from '@/types/workspace'

type SceneBounds = {
  minX: number
  maxX: number
  minZ: number
  maxZ: number
  width: number
  depth: number
  centerX: number
  centerZ: number
}

type Props = {
  mode: CameraMode
  initialPosition: { x: number; y: number; z: number }
  sceneBounds: SceneBounds
  rooms: SceneRoom[]
}

type KeyState = {
  forward: boolean
  back: boolean
  left: boolean
  right: boolean
}

function pointInPolygon(point: WallPoint, poly: WallPoint[]): boolean {
  // Ray casting algorithm.
  let inside = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i]!.x
    const zi = poly[i]!.z
    const xj = poly[j]!.x
    const zj = poly[j]!.z

    const intersects = zi > point.z !== zj > point.z &&
      point.x < ((xj - xi) * (point.z - zi)) / (zj - zi + 1e-9) + xi
    if (intersects) inside = !inside
  }
  return inside
}

function isInsideAnyRoom(p: WallPoint, rooms: SceneRoom[]): boolean {
  for (const r of rooms) {
    if (r.shape.length >= 3 && pointInPolygon(p, r.shape)) return true
  }
  return false
}

function OrbitCameraController({ sceneBounds }: { sceneBounds: SceneBounds }) {
  const { camera } = useThree()

  const centerX = (sceneBounds.minX + sceneBounds.maxX) / 2
  const centerZ = (sceneBounds.minZ + sceneBounds.maxZ) / 2
  const maxDim = Math.max(sceneBounds.width, sceneBounds.depth, 1)

  useEffect(() => {
    const targetPos = new THREE.Vector3(centerX + maxDim * 0.8, maxDim * 0.9, centerZ + maxDim * 0.8)
    const startPos = new THREE.Vector3(targetPos.x, targetPos.y * 3, targetPos.z)

    camera.position.copy(startPos)
    camera.up.set(0, 1, 0)
    camera.lookAt(centerX, 0, centerZ)
    camera.updateProjectionMatrix()

    const start = performance.now()
    const duration = 1500
    let raf = 0

    function easeOutCubic(t: number): number {
      return 1 - Math.pow(1 - t, 3)
    }

    function tick(now: number) {
      const t = Math.min(1, (now - start) / duration)
      const k = easeOutCubic(t)
      camera.position.lerpVectors(startPos, targetPos, k)
      camera.lookAt(centerX, 0, centerZ)
      if (t < 1) raf = requestAnimationFrame(tick)
    }

    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [camera, centerX, centerZ, maxDim])

  return (
    <OrbitControls
      makeDefault
      target={[centerX, 0, centerZ]}
      enablePan
      enableZoom
      enableRotate
      enableDamping
      dampingFactor={0.05}
      rotateSpeed={0.8}
      zoomSpeed={1.2}
      panSpeed={0.8}
      minDistance={1}
      maxDistance={maxDim * 4}
      minPolarAngle={0.05}
      maxPolarAngle={Math.PI / 2.1}
      mouseButtons={{
        LEFT: THREE.MOUSE.ROTATE,
        MIDDLE: THREE.MOUSE.DOLLY,
        RIGHT: THREE.MOUSE.PAN,
      }}
      touches={{
        ONE: THREE.TOUCH.ROTATE,
        TWO: THREE.TOUCH.DOLLY_PAN,
      }}
    />
  )
}

function TopdownCameraController({ sceneBounds }: { sceneBounds: SceneBounds }) {
  const { camera } = useThree()

  const centerX = (sceneBounds.minX + sceneBounds.maxX) / 2
  const centerZ = (sceneBounds.minZ + sceneBounds.maxZ) / 2
  const maxDim = Math.max(sceneBounds.width, sceneBounds.depth, 1)

  useEffect(() => {
    const targetPos = new THREE.Vector3(centerX, maxDim * 1.2, centerZ)
    const startPos = new THREE.Vector3(centerX, targetPos.y * 2.5, centerZ)

    camera.position.copy(startPos)
    camera.up.set(0, 0, -1)
    camera.lookAt(centerX, 0, centerZ)
    camera.updateProjectionMatrix()

    const start = performance.now()
    const duration = 1200
    let raf = 0

    function easeOutCubic(t: number): number {
      return 1 - Math.pow(1 - t, 3)
    }

    function tick(now: number) {
      const t = Math.min(1, (now - start) / duration)
      const k = easeOutCubic(t)
      camera.position.lerpVectors(startPos, targetPos, k)
      camera.lookAt(centerX, 0, centerZ)
      if (t < 1) raf = requestAnimationFrame(tick)
    }

    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [camera, centerX, centerZ, maxDim])

  return (
    <OrbitControls
      makeDefault
      target={[centerX, 0, centerZ]}
      enableRotate={false}
      enablePan
      enableZoom
      enableDamping
      dampingFactor={0.05}
      zoomSpeed={1.2}
      panSpeed={0.8}
      minDistance={1}
      maxDistance={maxDim * 4}
      mouseButtons={{
        LEFT: THREE.MOUSE.PAN,
        MIDDLE: THREE.MOUSE.DOLLY,
        RIGHT: THREE.MOUSE.PAN,
      }}
      touches={{
        ONE: THREE.TOUCH.PAN,
        TWO: THREE.TOUCH.DOLLY_PAN,
      }}
    />
  )
}

export default function CameraController({ mode, initialPosition, sceneBounds, rooms }: Props) {
  const { camera, gl } = useThree()
  const modeRef = useRef<CameraMode>(mode)
  const roomsRef = useRef(rooms)
  const cameraRef = useRef(camera)

  const keyState = useRef<KeyState>({ forward: false, back: false, left: false, right: false })
  const dragging = useRef(false)
  const lastPointer = useRef<{ x: number; y: number } | null>(null)
  const yaw = useRef(0)
  const pitch = useRef(0)
  const speedMul = useRef(1)
  const lastPinchDist = useRef<number | null>(null)

  const maxDim = Math.max(sceneBounds.width, sceneBounds.depth, 1)

  useEffect(() => {
    modeRef.current = mode
  }, [mode])

  useEffect(() => {
    roomsRef.current = rooms
  }, [rooms])

  useEffect(() => {
    cameraRef.current = camera
  }, [camera])

  useEffect(() => {
    if (mode !== 'walk') return

    camera.position.set(initialPosition.x, 1.6, initialPosition.z)
    camera.up.set(0, 1, 0)
    camera.lookAt(initialPosition.x, 1.6, initialPosition.z - 1)
    const e = new THREE.Euler().setFromQuaternion(camera.quaternion, 'YXZ')
    yaw.current = e.y
    pitch.current = e.x
  }, [camera, initialPosition.x, initialPosition.z, mode])

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (modeRef.current !== 'walk') return
      if (e.key === 'w' || e.key === 'ArrowUp') keyState.current.forward = true
      if (e.key === 's' || e.key === 'ArrowDown') keyState.current.back = true
      if (e.key === 'a' || e.key === 'ArrowLeft') keyState.current.left = true
      if (e.key === 'd' || e.key === 'ArrowRight') keyState.current.right = true
    }
    function onKeyUp(e: KeyboardEvent) {
      if (e.key === 'w' || e.key === 'ArrowUp') keyState.current.forward = false
      if (e.key === 's' || e.key === 'ArrowDown') keyState.current.back = false
      if (e.key === 'a' || e.key === 'ArrowLeft') keyState.current.left = false
      if (e.key === 'd' || e.key === 'ArrowRight') keyState.current.right = false
    }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [])

  useEffect(() => {
    const el = gl.domElement

    function onPointerDown(ev: PointerEvent) {
      if (modeRef.current !== 'walk') return
      dragging.current = true
      lastPointer.current = { x: ev.clientX, y: ev.clientY }
    }

    function onPointerUp() {
      dragging.current = false
      lastPointer.current = null
    }

    function onPointerMove(ev: PointerEvent) {
      if (modeRef.current !== 'walk') return
      if (!dragging.current || !lastPointer.current) return
      const dx = ev.clientX - lastPointer.current.x
      const dy = ev.clientY - lastPointer.current.y
      lastPointer.current = { x: ev.clientX, y: ev.clientY }

      const sens = 0.002
      yaw.current -= dx * sens
      pitch.current -= dy * sens
      pitch.current = THREE.MathUtils.clamp(pitch.current, -1.1, 1.1)
    }

    function onWheel(ev: WheelEvent) {
      if (modeRef.current !== 'walk') return
      const delta = Math.sign(ev.deltaY)
      speedMul.current = THREE.MathUtils.clamp(speedMul.current + delta * 0.1, 0.4, 2.5)
    }

    function touchDist(t0: Touch, t1: Touch): number {
      const dx = t1.clientX - t0.clientX
      const dy = t1.clientY - t0.clientY
      return Math.hypot(dx, dy)
    }

    function onTouchStart(ev: TouchEvent) {
      if (modeRef.current !== 'walk') return
      if (ev.touches.length === 2) {
        lastPinchDist.current = touchDist(ev.touches[0]!, ev.touches[1]!)
      }
      if (ev.touches.length === 1) {
        dragging.current = true
        lastPointer.current = { x: ev.touches[0]!.clientX, y: ev.touches[0]!.clientY }
      }
    }

    function onTouchMove(ev: TouchEvent) {
      if (modeRef.current !== 'walk') return

      const cam = cameraRef.current
      const sceneRooms = roomsRef.current

      if (ev.touches.length === 2) {
        const d = touchDist(ev.touches[0]!, ev.touches[1]!)
        const prev = lastPinchDist.current
        lastPinchDist.current = d
        if (prev != null) {
          const delta = (prev - d) * 0.002
          const forwardDir = new THREE.Vector3(0, 0, -1).applyQuaternion(cam.quaternion)
          forwardDir.y = 0
          forwardDir.normalize()
          const step = forwardDir.multiplyScalar(delta * 3 * speedMul.current)
          const next = cam.position.clone().add(step)
          next.y = 1.6
          const allowed = isInsideAnyRoom({ x: next.x, z: next.z }, sceneRooms)
          if (allowed) cam.position.copy(next)
        }
        return
      }

      if (ev.touches.length === 1) {
        const t0 = ev.touches[0]!
        if (!dragging.current || !lastPointer.current) {
          dragging.current = true
          lastPointer.current = { x: t0.clientX, y: t0.clientY }
          return
        }
        const dx = t0.clientX - lastPointer.current.x
        const dy = t0.clientY - lastPointer.current.y
        lastPointer.current = { x: t0.clientX, y: t0.clientY }
        const sens = 0.002
        yaw.current -= dx * sens
        pitch.current -= dy * sens
        pitch.current = THREE.MathUtils.clamp(pitch.current, -1.1, 1.1)
      }
    }

    function onTouchEnd() {
      lastPinchDist.current = null
      dragging.current = false
      lastPointer.current = null
    }

    el.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('pointerup', onPointerUp)
    window.addEventListener('pointercancel', onPointerUp)
    window.addEventListener('pointermove', onPointerMove)
    el.addEventListener('wheel', onWheel, { passive: true })
    el.addEventListener('touchstart', onTouchStart, { passive: true })
    el.addEventListener('touchmove', onTouchMove, { passive: true })
    el.addEventListener('touchend', onTouchEnd)
    el.addEventListener('touchcancel', onTouchEnd)

    return () => {
      el.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('pointerup', onPointerUp)
      window.removeEventListener('pointercancel', onPointerUp)
      window.removeEventListener('pointermove', onPointerMove)
      el.removeEventListener('wheel', onWheel)
      el.removeEventListener('touchstart', onTouchStart)
      el.removeEventListener('touchmove', onTouchMove)
      el.removeEventListener('touchend', onTouchEnd)
      el.removeEventListener('touchcancel', onTouchEnd)
    }
  }, [gl.domElement])

  useFrame((_, delta) => {
    if (modeRef.current !== 'walk') return

    const speed = 3 * speedMul.current
    const move = new THREE.Vector3(0, 0, 0)

    if (keyState.current.forward) move.z += 1
    if (keyState.current.back) move.z -= 1
    if (keyState.current.left) move.x -= 1
    if (keyState.current.right) move.x += 1
    if (move.lengthSq() > 0) move.normalize()

    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(pitch.current, yaw.current, 0, 'YXZ'))
    camera.quaternion.copy(q)

    const forwardDir = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion)
    forwardDir.y = 0
    forwardDir.normalize()
    const rightDir = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion)
    rightDir.y = 0
    rightDir.normalize()

    const step = new THREE.Vector3()
      .addScaledVector(forwardDir, move.z)    // remove the negative
      .addScaledVector(rightDir, move.x)
      .multiplyScalar(speed * delta)

    const next = camera.position.clone().add(step)
    next.y = 1.6

    const allowed = isInsideAnyRoom({ x: next.x, z: next.z }, roomsRef.current)
    if (allowed) camera.position.copy(next)
  })

  const controller = useMemo(() => {
    if (mode === 'orbit') return <OrbitCameraController sceneBounds={sceneBounds} />
    if (mode === 'topdown') return <TopdownCameraController sceneBounds={sceneBounds} />
    return null
  }, [mode, sceneBounds])

  // For walk mode: keep camera within reasonable bounds even if data is odd.
  useEffect(() => {
    if (mode !== 'walk') return
    const minX = sceneBounds.minX - maxDim
    const maxX = sceneBounds.maxX + maxDim
    const minZ = sceneBounds.minZ - maxDim
    const maxZ = sceneBounds.maxZ + maxDim
    const cam = cameraRef.current
    cam.position.x = THREE.MathUtils.clamp(cam.position.x, minX, maxX)
    cam.position.z = THREE.MathUtils.clamp(cam.position.z, minZ, maxZ)
  }, [maxDim, mode, sceneBounds.maxX, sceneBounds.maxZ, sceneBounds.minX, sceneBounds.minZ])

  return <>{controller}</>
}
