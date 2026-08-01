import { useMemo } from "react";
import * as THREE from 'three'
import { WallMat } from './wallmat';
import { WallMaterial } from '../lib/constants';

export function ArchHeader3D({ width, headerH, thickness, angle, mat, color, roughness }: {
    width: number; headerH: number; thickness: number
    angle: number; mat: WallMaterial; color: string; roughness: number
}) {
    const geometry = useMemo(() => {
        const hw = width / 2
        const r = Math.min(hw, headerH)
        const shape = new THREE.Shape()
        shape.moveTo(-hw, 0)
        shape.lineTo(-hw, headerH)
        shape.lineTo(hw, headerH)
        shape.lineTo(hw, 0)
        if (r < hw) shape.lineTo(r, 0)
        shape.absarc(0, 0, r, 0, Math.PI, false)
        if (r < hw) shape.lineTo(-hw, 0)

        const geo = new THREE.ExtrudeGeometry(shape, { depth: thickness, bevelEnabled: false })
        geo.translate(0, 0, -thickness / 2)
        return geo
    }, [width, headerH, thickness])

    return (
        <mesh geometry={geometry} rotation={[0, angle, 0]} castShadow receiveShadow>
            <WallMat mat={mat} color={color} roughness={roughness} width={width} height={headerH} depth={thickness} />
        </mesh>
    )
}