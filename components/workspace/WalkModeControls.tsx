import { useFrame, useThree } from "@react-three/fiber"
import { useEffect, useMemo, useRef, type RefObject } from "react"
import * as THREE from "three"
import { deriveClosedPolygons, getFloorContentBounds } from "@/lib/helpers"
import type { FloorPlanState } from "./lib/constants"

const EYE_HEIGHT = 1.6
const STEP_UP = 0.42

function walkSpawn(fp: FloorPlanState) {
    const nodes = new Map(fp.lineNodes.map(node => [node.id, node]))
    const cutouts = new Set((fp.closedShapes ?? []).filter(shape => shape.cutout?.enabled)
        .map(shape => [...shape.nodeIds].sort().join(",")))
    let best = { score: 0, x: 0, z: 0 }
    for (const room of fp.rooms) {
        const score = Math.min(room.width, room.depth) / 2
        if (score > best.score) best = { score, x: room.x + room.width / 2, z: room.z + room.depth / 2 }
    }

    // A polygon's bounding-box center can be outside a concave room.
    for (const ids of deriveClosedPolygons(fp.lineNodes, fp.lineSegments)) {
        if (cutouts.has([...ids].sort().join(","))) continue
        const points = ids.map(id => nodes.get(id)).filter(node => node !== undefined)
            .map(node => new THREE.Vector2(node.x, node.z))
        if (points.length < 3) continue
        for (const [a, b, c] of THREE.ShapeUtils.triangulateShape(points, [])) {
            const p = points[a], q = points[b], r = points[c]
            const pq = p.distanceTo(q), qr = q.distanceTo(r), rp = r.distanceTo(p)
            const perimeter = pq + qr + rp
            const areaTwice = Math.abs((q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x))
            const score = perimeter ? areaTwice / perimeter : 0
            if (score > best.score) {
                best = { score, x: (p.x * qr + q.x * rp + r.x * pq) / perimeter,
                    z: (p.y * qr + q.y * rp + r.y * pq) / perimeter }
            }
        }
    }
    if (best.score) return best
    const bounds = getFloorContentBounds(fp)
    return bounds ? { x: (bounds.minX + bounds.maxX) / 2, z: (bounds.minZ + bounds.maxZ) / 2 } : best
}

export type WalkPose = { x: number; z: number; footY: number; heading: number }

export function WalkModeControls({ fp, surfacesKey, pose, onExit, speed = 3.5 }: {
    fp: FloorPlanState
    surfacesKey: unknown
    pose?: RefObject<WalkPose | null>
    onExit?: () => void
    speed?: number
}) {
    const { camera, gl, scene, invalidate } = useThree()
    const spawn = useMemo(() => walkSpawn(fp), [fp])
    const keys = useRef(new Set<string>())
    const foot = useRef(0)
    const surfaceCache = useRef<THREE.Object3D[] | null>(null)
    const scratch = useMemo(() => ({
        direction: new THREE.Vector3(),
        forward: new THREE.Vector3(),
        right: new THREE.Vector3(),
        up: new THREE.Vector3(0, 1, 0),
        down: new THREE.Vector3(0, -1, 0),
        origin: new THREE.Vector3(),
        ray: new THREE.Raycaster(undefined, undefined, 0, 0.95),
        hits: [] as THREE.Intersection[],
        look: new THREE.Euler(0, 0, 0, "YXZ"),
    }), [])

    useEffect(() => {
        foot.current = 0
        camera.position.set(spawn.x, EYE_HEIGHT, spawn.z)
        camera.lookAt(spawn.x, EYE_HEIGHT, spawn.z - 1)
        if (pose) pose.current = { x: spawn.x, z: spawn.z, footY: 0, heading: 0 }
        invalidate()
    }, [camera, spawn.x, spawn.z, invalidate, pose])

    useEffect(() => {
        surfaceCache.current = null
    }, [fp, surfacesKey])

    useEffect(() => {
        const canvas = gl.domElement
        const movement = /^(?:Key[WASD]|Arrow(?:Up|Down|Left|Right))$/
        let pointer: number | null = null
        const clear = () => keys.current.clear()
        const onDown = (event: KeyboardEvent) => {
            const target = event.target
            if (!movement.test(event.code) || event.metaKey || event.ctrlKey || event.altKey ||
                (target instanceof HTMLElement && (target.isContentEditable || target.closest("input, textarea, select")))) return
            event.preventDefault()
            event.stopPropagation()
            keys.current.add(event.code)
        }
        const onUp = (event: KeyboardEvent) => keys.current.delete(event.code)
        const startLook = (event: PointerEvent) => {
            if (event.button !== 0 || pointer !== null) return
            if (event.pointerType === "mouse") return
            pointer = event.pointerId
            canvas.setPointerCapture(pointer)
        }
        const lockLook = () => {
            if (document.pointerLockElement || !canvas.requestPointerLock) return
            // A denied lock leaves regular mouse-look available.
            void canvas.requestPointerLock()?.catch(() => {})
        }
        let previousMouse: { x: number; y: number } | null = null
        const resetMouse = () => { previousMouse = null }
        let hadPointerLock = false
        const onLockChange = () => {
            const locked = document.pointerLockElement === canvas
            const released = hadPointerLock && !locked
            hadPointerLock = locked
            resetMouse()
            if (released) {
                clear()
                onExit?.()
            }
        }
        const look = (event: PointerEvent) => {
            if (event.pointerType !== "mouse" && pointer !== event.pointerId) return
            if (document.pointerLockElement === canvas) return
            const previous = previousMouse
            previousMouse = { x: event.clientX, y: event.clientY }
            if (!previous) return
            rotateLook(event.clientX - previous.x, event.clientY - previous.y)
        }
        const lockedLook = (event: MouseEvent) => {
            if (document.pointerLockElement === canvas) rotateLook(event.movementX, event.movementY)
        }
        const rotateLook = (dx: number, dy: number) => {
            scratch.look.setFromQuaternion(camera.quaternion, "YXZ")
            scratch.look.y -= dx * 0.004
            scratch.look.x = THREE.MathUtils.clamp(scratch.look.x - dy * 0.004, -1.5, 1.5)
            camera.quaternion.setFromEuler(scratch.look)
            if (pose?.current) pose.current.heading = -THREE.MathUtils.radToDeg(scratch.look.y)
            invalidate()
        }
        const stopLook = (event: PointerEvent) => {
            if (event.pointerId === pointer) {
                pointer = null
                resetMouse()
            }
        }
        const lens = camera instanceof THREE.PerspectiveCamera ? camera : null
        const originalFov = lens?.fov
        const zoom = (event: WheelEvent) => {
            if (!lens || event.ctrlKey) return
            event.preventDefault()
            const multiplier = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? 120 : 1
            lens.fov = THREE.MathUtils.clamp(lens.fov + event.deltaY * multiplier * 0.035, 25, 75)
            lens.updateProjectionMatrix()
            invalidate()
        }
        const touchAction = canvas.style.touchAction
        canvas.style.touchAction = "none"
        window.addEventListener("keydown", onDown, true)
        window.addEventListener("keyup", onUp)
        window.addEventListener("blur", clear)
        document.addEventListener("pointerlockchange", onLockChange)
        document.addEventListener("mousemove", lockedLook)
        canvas.addEventListener("click", lockLook)
        canvas.addEventListener("pointerdown", startLook)
        canvas.addEventListener("pointermove", look)
        canvas.addEventListener("pointerleave", resetMouse)
        canvas.addEventListener("wheel", zoom, { passive: false })
        canvas.addEventListener("lostpointercapture", stopLook)
        return () => {
            clear()
            document.removeEventListener("pointerlockchange", onLockChange)
            document.removeEventListener("mousemove", lockedLook)
            canvas.removeEventListener("click", lockLook)
            if (document.pointerLockElement === canvas) document.exitPointerLock()
            if (pointer !== null && canvas.hasPointerCapture(pointer)) canvas.releasePointerCapture(pointer)
            canvas.style.touchAction = touchAction
            if (lens && originalFov !== undefined) {
                lens.fov = originalFov
                lens.updateProjectionMatrix()
            }
            window.removeEventListener("keydown", onDown, true)
            window.removeEventListener("keyup", onUp)
            window.removeEventListener("blur", clear)
            canvas.removeEventListener("pointerdown", startLook)
            canvas.removeEventListener("pointermove", look)
            canvas.removeEventListener("pointerleave", resetMouse)
            canvas.removeEventListener("wheel", zoom)
            canvas.removeEventListener("lostpointercapture", stopLook)
        }
    }, [camera, gl, invalidate, pose, onExit, scratch])

    useFrame((_, delta) => {
        if (!keys.current.size) return
        const { direction, forward, right, up, down, origin, ray, hits } = scratch
        if (!surfaceCache.current) {
            const surfaces: THREE.Object3D[] = []
            scene.traverseVisible(object => { if (object.userData.walkSurface) surfaces.push(object) })
            surfaceCache.current = surfaces.length ? surfaces : null
        }
        const pressed = keys.current
        camera.getWorldDirection(forward)
        forward.y = 0
        forward.normalize()
        right.crossVectors(forward, up)
        direction.set(0, 0, 0)
        if (pressed.has("KeyW") || pressed.has("ArrowUp")) direction.add(forward)
        if (pressed.has("KeyS") || pressed.has("ArrowDown")) direction.sub(forward)
        if (pressed.has("KeyA") || pressed.has("ArrowLeft")) direction.sub(right)
        if (pressed.has("KeyD") || pressed.has("ArrowRight")) direction.add(right)
        if (!direction.lengthSq()) return
        direction.normalize()
        camera.position.addScaledVector(direction, speed * Math.min(delta, 0.05))
        if (surfaceCache.current) {
            origin.set(camera.position.x, foot.current + STEP_UP, camera.position.z)
            ray.set(origin, down)
            hits.length = 0
            ray.intersectObjects(surfaceCache.current, false, hits)
            if (hits.length) foot.current = hits[0].point.y
        }
        camera.position.y = THREE.MathUtils.damp(camera.position.y, foot.current + EYE_HEIGHT, 16, delta)
        if (pose?.current) {
            pose.current.x = camera.position.x
            pose.current.z = camera.position.z
            pose.current.footY = foot.current
        }
    })

    return null
}
