'use client'

import { useMemo } from 'react'
import * as THREE from 'three'
import { deriveClosedPolygons } from '@/lib/helpers'
import { FloorPlanState, LineNode } from './lib/constants'

type FloorCapProps = {
    fp: FloorPlanState
    floorAbove?: FloorPlanState
    height: number
    color?: string
    stairPadding?: number
    floorAboveId?: string
}

type AABB = { minX: number; maxX: number; minZ: number; maxZ: number }

function roomAABB(room: FloorPlanState['rooms'][number]): AABB {
    return { minX: room.x, maxX: room.x + room.width, minZ: room.z, maxZ: room.z + room.depth }
}

function aabbIntersect(a: AABB, b: AABB): AABB | null {
    const minX = Math.max(a.minX, b.minX)
    const maxX = Math.min(a.maxX, b.maxX)
    const minZ = Math.max(a.minZ, b.minZ)
    const maxZ = Math.min(a.maxZ, b.maxZ)
    if (maxX - minX < 0.05 || maxZ - minZ < 0.05) return null // negligible/no overlap
    return { minX, maxX, minZ, maxZ }
}

function shapeFromAABB(box: AABB): THREE.Shape {
    const s = new THREE.Shape()
    s.moveTo(box.minX, box.minZ)
    s.lineTo(box.maxX, box.minZ)
    s.lineTo(box.maxX, box.maxZ)
    s.lineTo(box.minX, box.maxZ)
    s.closePath()
    return s
}

function pathFromAABB(box: AABB): THREE.Path {
    const p = new THREE.Path()
    p.moveTo(box.minX, box.minZ)
    p.lineTo(box.maxX, box.minZ)
    p.lineTo(box.maxX, box.maxZ)
    p.lineTo(box.minX, box.maxZ)
    p.closePath()
    return p
}

export function FloorCap({ fp, floorAbove, height, color = '#DCD8D0', stairPadding = 0.3, floorAboveId }: FloorCapProps) {
    const nodesById = useMemo(
        () => new Map(fp.lineNodes.map(n => [n.id, n])),
        [fp.lineNodes]
    )

    const closedPolygons = useMemo(
        () => deriveClosedPolygons(fp.lineNodes, fp.lineSegments ?? []),
        [fp.lineNodes, fp.lineSegments]
    )



    const cutoutHoles: AABB[] = useMemo(() => {
        return (fp.closedShapes ?? [])
            .filter(sh => sh.cutout?.enabled && (!sh.cutout.toLevel || sh.cutout.toLevel === floorAboveId))
            .map(sh => {
                const nodes = sh.nodeIds.map(id => nodesById.get(id)).filter(Boolean) as LineNode[]
                if (nodes.length < 3) return null
                const pad = sh.cutout?.openingOffset ?? 0.15
                const xs = nodes.map(n => n.x), zs = nodes.map(n => n.z)
                return {
                    minX: Math.min(...xs) - pad, maxX: Math.max(...xs) + pad,
                    minZ: Math.min(...zs) - pad, maxZ: Math.max(...zs) + pad,
                }
            })
            .filter(Boolean) as AABB[]
    }, [fp.closedShapes, nodesById, floorAboveId])


    const roomCapShapes = useMemo(() => {
        if (!floorAbove) return [] // nothing above => nothing to stand on => no cap
        const shapes: THREE.Shape[] = []
        for (const roomBelow of fp.rooms) {
            const belowBox = roomAABB(roomBelow)
            for (const roomAbove of floorAbove.rooms) {
                const overlap = aabbIntersect(belowBox, roomAABB(roomAbove))
                if (!overlap) continue
                const shape = shapeFromAABB(overlap)
                // Punch stair holes that fall inside this overlap region
                for (const hole of cutoutHoles) {
                    const holeOverlap = aabbIntersect(overlap, hole)
                    if (holeOverlap) shape.holes.push(pathFromAABB(holeOverlap))
                }
                shapes.push(shape)
            }
        }
        return shapes
    }, [fp.rooms, floorAbove, cutoutHoles])

    const lineShapes = useMemo(() => {
        if (!floorAbove) return []
        const shapes: THREE.Shape[] = []
        for (const nodeIds of closedPolygons) {
            const pts = nodeIds
                .map(id => nodesById.get(id))
                .filter((n): n is NonNullable<typeof n> => !!n)
            if (pts.length < 3) continue

            const xs = pts.map(p => p.x), zs = pts.map(p => p.z)
            const bbox: AABB = { minX: Math.min(...xs), maxX: Math.max(...xs), minZ: Math.min(...zs), maxZ: Math.max(...zs) }
            const hasSomethingAbove = floorAbove.rooms.some(r => aabbIntersect(bbox, roomAABB(r)))
            if (!hasSomethingAbove) continue

            const shape = new THREE.Shape()
            shape.moveTo(pts[0]!.x, pts[0]!.z)
            for (let i = 1; i < pts.length; i++) shape.lineTo(pts[i]!.x, pts[i]!.z)
            shape.closePath()

            for (const hole of cutoutHoles) {
                const holeOverlap = aabbIntersect(bbox, hole)
                if (holeOverlap) shape.holes.push(pathFromAABB(holeOverlap))
            }

            shapes.push(shape)
        }
        return shapes
    }, [closedPolygons, nodesById, floorAbove, cutoutHoles])

    const allShapes = [...roomCapShapes, ...lineShapes]
    if (allShapes.length === 0) return null

    const CAP_THICKNESS = 0.12

    return (
        <group position={[0, height, 0]}>
            {allShapes.map((shape, i) => (
                <mesh
                    key={i}
                    position={[0, -CAP_THICKNESS / 2, 0]}
                    rotation={[-Math.PI / 2, 0, 0]}
                    receiveShadow
                    castShadow
                >
                    <extrudeGeometry
                        args={[shape, { depth: CAP_THICKNESS, bevelEnabled: false }]}
                    />
                    <meshStandardMaterial
                        color={color}
                        roughness={0.85}
                        metalness={0}
                        side={THREE.FrontSide}
                    />
                </mesh>
            ))}
        </group>
    )
}