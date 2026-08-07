import { useMemo } from "react";
import * as THREE from 'three'
import { WallMat } from './wallmat';
import { WallMaterial } from '../lib/constants';

export function ArchHeader3D({
    width, headerH, thickness, angle, mat, color, roughness,
    opacity = 1, transparent = false,
}: {
    width: number; headerH: number; thickness: number
    angle: number; mat: WallMaterial; color: string; roughness: number
    opacity?: number; transparent?: boolean
}) {
    const geometry = useMemo(() => {
        const hw = width / 2

        const shape = new THREE.Shape()
        shape.moveTo(-hw, 0)
        shape.lineTo(-hw, headerH)
        shape.lineTo(hw, headerH)
        shape.lineTo(hw, 0)
        // FIX: previously used absarc with radius = min(hw, headerH),
        // which is a CIRCULAR arc — on any opening wider than it is tall,
        // that radius gets clamped to headerH, leaving flat straight
        // shoulders on either side of a small centered hump instead of a
        // full arch (see bug screenshot). An ELLIPTICAL arc — xRadius = hw
        // (always the full half-width), yRadius = headerH (the full
        // rise) — spans the entire opening width smoothly no matter the
        // aspect ratio. At the center the arc peak exactly touches the
        // header's top edge (y = headerH), so the header material tapers
        // from full thickness at the springline down to a point at the
        // crown — the correct look for a true arch, not just "avoids the
        // flat spot."
        shape.absellipse(0, 0, hw, headerH, 0, Math.PI, false, 0)
        shape.lineTo(-hw, 0)

        // curveSegments bumped up from the extrude default (12) — a wide
        // arch made of only 12 segments visibly facets/polygonizes at
        // large widths; 32 keeps the curve smooth across any span.
        const geo = new THREE.ExtrudeGeometry(shape, { depth: thickness, bevelEnabled: false, curveSegments: 32 })
        geo.translate(0, 0, -thickness / 2)
        return geo
    }, [width, headerH, thickness])

    return (
        <mesh geometry={geometry} rotation={[0, angle, 0]} castShadow receiveShadow>
            <WallMat mat={mat} color={color} roughness={roughness} width={width} height={headerH} depth={thickness}
                opacity={opacity} transparent={transparent} />
        </mesh>
    )
}