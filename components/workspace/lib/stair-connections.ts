import type { Floor } from './floor-data'
import type { FloorPlanState } from './constants'
import { stairCutoutFootprint, type PlacedStairs } from './stairs-constants'

export type StairConnection = { source: Floor; destination: Floor; stair: PlacedStairs }

/** Old plans without level IDs connect to the next level, without mutating saves. */
export function getStairConnections(floors: Floor[]): StairConnection[] {
    const ordered = [...floors].sort((a, b) => a.elevation - b.elevation)
    return ordered.flatMap((source, index) => (source.state.stairs ?? []).flatMap(stair => {
        const destination = stair.toLevel
            ? ordered.find(floor => floor.id === stair.toLevel)
            : ordered[index + 1]
        if (!destination || destination.id === source.id || destination.elevation <= source.elevation) return []
        if (stair.fromLevel && stair.fromLevel !== source.id) return []
        return [{ source, destination, stair }]
    }))
}

/** Derived openings also reach polygon slabs through the existing cutout path. */
export function withStairOpenings(state: FloorPlanState, connections: StairConnection[], floorId: string): FloorPlanState {
    const incoming = connections.filter(connection => connection.destination.id === floorId &&
        connection.stair.openingMode !== 'none' && connection.stair.autoCutout !== false)
    if (!incoming.length) return state
    const lineNodes = [...state.lineNodes]
    const closedShapes = [...(state.closedShapes ?? [])]
    for (const { source, stair } of incoming) {
        const points = stairCutoutFootprint(stair)
        // Keep explicit, already authored openings instead of punching overlapping holes.
        const covered = closedShapes.some(shape => shape.cutout?.enabled && points.every(point => {
            const polygon = shape.nodeIds.map(id => lineNodes.find(node => node.id === id)).filter(Boolean) as { x: number; z: number }[]
            return polygon.length >= 3 && pointInPolygon(point, polygon)
        }))
        if (covered) continue
        const id = `stair-opening:${source.id}:${stair.id}`
        const nodes = points.map((point, i) => ({ ...point, id: id + ':' + i }))
        lineNodes.push(...nodes)
        closedShapes.push({ id, nodeIds: nodes.map(node => node.id), label: 'Stair opening', cutout: { enabled: true } })
    }
    return { ...state, lineNodes, closedShapes }
}

function pointInPolygon(point: { x: number; z: number }, polygon: { x: number; z: number }[]): boolean {
    let inside = false
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const a = polygon[i], b = polygon[j]
        const cross = (point.x - a.x) * (b.z - a.z) - (point.z - a.z) * (b.x - a.x)
        if (Math.abs(cross) < 1e-7 && point.x >= Math.min(a.x, b.x) - 1e-7 && point.x <= Math.max(a.x, b.x) + 1e-7 && point.z >= Math.min(a.z, b.z) - 1e-7 && point.z <= Math.max(a.z, b.z) + 1e-7) return true
        if ((a.z > point.z) !== (b.z > point.z) && point.x < (b.x - a.x) * (point.z - a.z) / (b.z - a.z) + a.x) inside = !inside
    }
    return inside
}
