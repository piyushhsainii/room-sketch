import { useEffect, useMemo, useRef, useState, type RefObject } from "react"
import type { WalkPose } from "./WalkModeControls"
import type { FloorPlanState } from "./lib/constants"
import type { Floor } from "./lib/floor-data"

const SIZE = 144
const INSET = 12

export function WalkMinimap({ pose, floors, activeFloorId, fp }: {
    pose: RefObject<WalkPose | null>
    floors: Floor[]
    activeFloorId: string
    fp: FloorPlanState
}) {
    const [floorId, setFloorId] = useState(activeFloorId)
    const marker = useRef<SVGGElement>(null)
    const levels = useMemo(() => floors
        .filter(floor => floor.visible || floor.id === activeFloorId)
        .sort((a, b) => a.elevation - b.elevation), [floors, activeFloorId])
    const active = levels.find(floor => floor.id === activeFloorId)
    const displayed = levels.find(floor => floor.id === floorId) ?? active
    const plan = displayed?.id === activeFloorId ? fp : displayed?.state
    const map = useMemo(() => {
        if (!plan) return null
        const nodes = new Map(plan.lineNodes.map(node => [node.id, node]))
        const points = [...plan.lineNodes, ...plan.rooms.flatMap(room => [
            { x: room.x, z: room.z }, { x: room.x + room.width, z: room.z + room.depth },
        ])]
        if (!points.length) return null
        const minX = Math.min(...points.map(p => p.x)), maxX = Math.max(...points.map(p => p.x))
        const minZ = Math.min(...points.map(p => p.z)), maxZ = Math.max(...points.map(p => p.z))
        const scale = (SIZE - INSET * 2) / Math.max(maxX - minX, maxZ - minZ, 1)
        const x = (value: number) => SIZE / 2 + (value - (minX + maxX) / 2) * scale
        const z = (value: number) => SIZE / 2 + (value - (minZ + maxZ) / 2) * scale
        const walls = plan.lineSegments.map(segment => {
            const vertices = segment.nodeIds.map(id => nodes.get(id)).filter(node => node !== undefined)
            if (segment.closed && vertices.length) vertices.push(vertices[0])
            return { id: segment.id, points: vertices.map(node => `${x(node.x)},${z(node.z)}`).join(" ") }
        })
        return { x, z, scale, walls }
    }, [plan])

    useEffect(() => {
        let activeMapId = displayed?.id
        function update() {
            const current = pose.current
            if (!current || !active) return
            const elevation = active.elevation + current.footY
            const level = levels.findLast(floor => floor.elevation <= elevation + 0.12) ?? active
            if (level.id !== activeMapId) {
                activeMapId = level.id
                setFloorId(level.id)
            }
            if (!map || level.id !== displayed?.id) return
            const clamp = (value: number) => Math.min(SIZE - 8, Math.max(8, value))
            marker.current?.setAttribute("transform", `translate(${clamp(map.x(current.x))} ${clamp(map.z(current.z))}) rotate(${current.heading})`)
        }
        update()
        const timer = window.setInterval(update, 50)
        return () => window.clearInterval(timer)
    }, [active, displayed, levels, map, pose])

    return (
        <figure className="pointer-events-none absolute bottom-4 left-4 m-0 w-28 overflow-hidden rounded-2xl border border-white/20 bg-neutral-950/85 text-white shadow-lg sm:w-36" aria-label="Walk Mode minimap">
            <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="block w-full" aria-hidden="true">
                {map && plan && <>
                    {plan.rooms.map(room => (
                        <rect key={room.id} x={map.x(room.x)} y={map.z(room.z)} width={room.width * map.scale} height={room.depth * map.scale}
                            fill="#ffffff18" stroke="#e5e5e5" strokeWidth={1.6} />
                    ))}
                    {map.walls.map(wall => <polyline key={wall.id} points={wall.points} fill="none" stroke="#e5e5e5" strokeWidth={1.6} strokeLinejoin="round" />)}
                    <g ref={marker}><circle r={9} fill="#171717" /><path d="M0 -7 5 5 0 3 -5 5Z" fill="#a5f3fc" /></g>
                </>}
            </svg>
            <figcaption className="truncate border-t border-white/15 px-3 py-1.5 text-xs font-medium">{displayed?.label ?? "Floor plan"}</figcaption>
        </figure>
    )
}
