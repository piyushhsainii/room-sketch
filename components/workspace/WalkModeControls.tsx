import { PointerLockControls } from "@react-three/drei"
import { useFrame, useThree } from "@react-three/fiber"
import { useEffect, useRef } from "react"
import * as THREE from 'three'

export function WalkModeControls({ speed = 3.5 }: { speed?: number }) {
    const { camera } = useThree()
    const keysRef = useRef(new Set<string>())
    const velocityRef = useRef(new THREE.Vector3())

    useEffect(() => {
        camera.position.set(2, 1.6, 2)
        camera.lookAt(0, 1.6, 0)
    }, [camera])

    useEffect(() => {
        const onDown = (e: KeyboardEvent) => keysRef.current.add(e.code)
        const onUp = (e: KeyboardEvent) => keysRef.current.delete(e.code)
        window.addEventListener('keydown', onDown)
        window.addEventListener('keyup', onUp)
        return () => {
            window.removeEventListener('keydown', onDown)
            window.removeEventListener('keyup', onUp)
        }
    }, [])

    useFrame((_, delta) => {
        const keys = keysRef.current
        const dir = new THREE.Vector3()
        const forward = new THREE.Vector3()
        camera.getWorldDirection(forward)
        forward.y = 0
        forward.normalize()
        const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize()

        if (keys.has('KeyW') || keys.has('ArrowUp')) dir.add(forward)
        if (keys.has('KeyS') || keys.has('ArrowDown')) dir.sub(forward)
        if (keys.has('KeyA') || keys.has('ArrowLeft')) dir.sub(right)
        if (keys.has('KeyD') || keys.has('ArrowRight')) dir.add(right)

        if (dir.lengthSq() > 0) dir.normalize()

        const target = dir.multiplyScalar(speed)
        velocityRef.current.lerp(target, Math.min(1, delta * 8))
        camera.position.add(velocityRef.current.clone().multiplyScalar(delta))
        camera.position.y = 1.6 // Lock to eye height
    })

    return <PointerLockControls />
}