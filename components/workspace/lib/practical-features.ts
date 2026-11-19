import type { FloorPlanState } from './constants'
import type { ProjectFloorPlan } from './floor-data'
import { deriveClosedPolygons } from '@/lib/helpers'

export type RoomDimensionLock = { width?: number; depth?: number }
export type TracingImage = { id: string; width: number; height: number; x: number; z: number; opacity: number }

/** Database JSON objects can return keys in a different order. */
export function canonicalJSON(value: unknown): string {
    return JSON.stringify(value, (_key, item) => {
        if (!item || typeof item !== 'object' || Array.isArray(item)) return item
        return Object.fromEntries(Object.keys(item).sort().map(key => [key, item[key]]))
    })
}

export function applyDimensionLocks(previous: FloorPlanState, next: FloorPlanState): FloorPlanState {
    if (previous.rooms === next.rooms || !next.rooms.some(room => room.dimensionLock)) return next
    let changed = false
    const before = new Map(previous.rooms.map(room => [room.id, room]))
    const rooms = next.rooms.map(room => {
        const old = before.get(room.id)
        const width = room.dimensionLock?.width ?? room.width
        const depth = room.dimensionLock?.depth ?? room.depth
        if (!old || (width === room.width && depth === room.depth)) return room
        changed = true
        const x = Math.abs(room.x + room.width - old.x - old.width) < 0.001 ? old.x + old.width - width : room.x
        const z = Math.abs(room.z + room.depth - old.z - old.depth) < 0.001 ? old.z + old.depth - depth : room.z
        return { ...room, width, depth, x, z }
    })
    return changed ? { ...next, rooms } : next
}

export function polygonArea(points: { x: number; z: number }[]): number {
    return Math.abs(points.reduce((area, point, i) => {
        const next = points[(i + 1) % points.length]
        return area + point.x * next.z - next.x * point.z
    }, 0)) / 2
}

export function measureProject(plan: ProjectFloorPlan) {
    return plan.floors.map(floor => {
        const fp = floor.state
        const nodes = new Map(fp.lineNodes.map(node => [node.id, node]))
        const spaces = fp.rooms.filter(room => !room.cutout?.enabled).map(room => ({
            id: room.id, label: room.label, area: room.width * room.depth, perimeter: 2 * (room.width + room.depth),
        }))
        for (const ids of deriveClosedPolygons(fp.lineNodes, fp.lineSegments)) {
            const shape = fp.closedShapes?.find(shape => shape.nodeIds.length === ids.length && shape.nodeIds.every(id => ids.includes(id)))
            if (shape?.cutout?.enabled) continue
            const points = ids.map(id => nodes.get(id)).filter(node => node !== undefined)
            if (points.length < 3) continue
            spaces.push({ id: shape?.id ?? ids.join(','), label: shape?.label ?? 'Drawn area',
                area: polygonArea(points), perimeter: points.reduce((sum, point, i) => {
                    const next = points[(i + 1) % points.length]
                    return sum + Math.hypot(point.x - next.x, point.z - next.z)
                }, 0) })
        }
        const counts = new Map<string, number>()
        for (const item of [...(fp.furniture ?? []), ...(fp.stairs ?? []), ...(fp.lights ?? []), ...fp.openings]) {
            counts.set(item.type, (counts.get(item.type) ?? 0) + 1)
        }
        return { id: floor.id, label: floor.label, spaces, counts: [...counts], area: spaces.reduce((sum, space) => sum + space.area, 0) }
    })
}

export function measurementsCSV(plan: ProjectFloorPlan): string {
    const rows: (string | number)[][] = [['Floor', 'Item', 'Area (m2)', 'Perimeter (m)', 'Count']]
    for (const floor of measureProject(plan)) {
        floor.spaces.forEach(space => rows.push([floor.label, space.label, space.area.toFixed(2), space.perimeter.toFixed(2), '']))
        floor.counts.forEach(([type, count]) => rows.push([floor.label, type, '', '', count]))
    }
    return rows.map(row => row.map(value => {
        const text = String(value)
        return '"' + (/^[=+@\-\t\r]/.test(text) ? "'" + text : text).replaceAll('"', '""') + '"'
    }).join(',')).join('\r\n')
}

export function comparePlans(before: ProjectFloorPlan, after: ProjectFloorPlan) {
    const index = (plan: ProjectFloorPlan) => {
        const entries = new Map<string, string>()
        entries.set('project-settings', canonicalJSON({ roof: plan.roof, viewMode: plan.viewMode, showUnderlay: plan.showUnderlay }))
        for (const floor of plan.floors) {
            entries.set(floor.id, canonicalJSON({ label: floor.label, elevation: floor.elevation, order: floor.order,
                visible: floor.visible, height: floor.state.roomHeight, tracingImage: floor.state.tracingImage }))
            for (const [kind, entities] of Object.entries(floor.state)) {
                if (!Array.isArray(entities)) continue
                for (const entity of entities) {
                    if (entity && typeof entity === 'object' && 'id' in entity) {
                        if (kind === 'lineSegments') {
                            const wall = entity as FloorPlanState['lineSegments'][number]
                            for (let i = 1; i < wall.nodeIds.length; i++) {
                                const key = [wall.nodeIds[i - 1], wall.nodeIds[i]].sort().join('~')
                                entries.set(floor.id + '/' + kind + '/' + key, canonicalJSON({
                                    thickness: wall.thickness, wallType: wall.wallType ?? 'solid', height: wall.height,
                                }))
                            }
                            continue
                        }
                        entries.set(floor.id + '/' + kind + '/' + entity.id, canonicalJSON(entity))
                    }
                }
            }
        }
        return entries
    }
    const a = index(before), b = index(after)
    const changes = [...new Set([...a.keys(), ...b.keys()])].filter(id => a.get(id) !== b.get(id)).map(id => {
        const value = JSON.parse(b.get(id) ?? a.get(id)!) as { label?: string; type?: string }
        const floorId = id.split('/')[0]
        const floor = after.floors.find(floor => floor.id === floorId) ?? before.floors.find(floor => floor.id === floorId)
        return { id, label: value.label ?? value.type?.replaceAll('_', ' ') ?? id.split('/')[1] ?? 'Project settings',
            floor: floor?.label, action: !a.has(id) ? 'Added' : !b.has(id) ? 'Removed' : 'Changed' }
    })
    return {
        added: [...b.keys()].filter(id => !a.has(id)).length,
        removed: [...a.keys()].filter(id => !b.has(id)).length,
        changed: [...b.keys()].filter(id => a.has(id) && a.get(id) !== b.get(id)).length,
        changes,
    }
}

export function calibrationScale(a: { x: number; y: number }, b: { x: number; y: number }, metres: number) {
    const pixels = Math.hypot(b.x - a.x, b.y - a.y)
    if (!Number.isFinite(metres) || metres <= 0 || pixels < 2) throw new Error('Choose two distinct points and enter a distance greater than zero.')
    return metres / pixels
}
