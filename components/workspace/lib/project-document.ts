import type { FloorPlanState } from './constants'
import type { Floor, ProjectFloorPlan } from './floor-data'
import { recomputeFloorElevations } from './migrateToMultiFloor'
import { applyDimensionLocks } from './practical-features'

export function getActiveFloorState(plan: ProjectFloorPlan): FloorPlanState {
    const floor = plan.floors.find(floor => floor.id === plan.activeFloorId)
    if (!floor) throw new Error('Project has no active floor')
    return floor.state
}

/** Keep the existing tool updater contract while updating the owning document. */
export function updateActiveFloor(
    plan: ProjectFloorPlan,
    update: FloorPlanState | ((state: FloorPlanState) => FloorPlanState),
): ProjectFloorPlan {
    const previous = getActiveFloorState(plan)
    const state = applyDimensionLocks(previous, typeof update === 'function' ? update(previous) : update)
    if (state === previous) return plan
    const floors = plan.floors.map(floor =>
        floor.id === plan.activeFloorId ? { ...floor, state } : floor,
    )
    return {
        ...plan,
        floors: state.roomHeight === previous.roomHeight ? floors : recomputeFloorElevations(floors),
    }
}

export function switchDocumentFloor(plan: ProjectFloorPlan, floorId: string): ProjectFloorPlan {
    if (floorId === plan.activeFloorId || !plan.floors.some(floor => floor.id === floorId)) return plan
    return { ...plan, activeFloorId: floorId }
}

export function addDocumentFloor(plan: ProjectFloorPlan, floor: Floor): ProjectFloorPlan {
    if (plan.floors.some(existing => existing.id === floor.id)) return plan
    return { ...plan, floors: recomputeFloorElevations([...plan.floors, floor]), activeFloorId: floor.id }
}

export function deleteDocumentFloor(plan: ProjectFloorPlan, floorId: string): ProjectFloorPlan {
    if (plan.floors.length <= 1 || !plan.floors.some(floor => floor.id === floorId)) return plan
    const floors = recomputeFloorElevations(plan.floors.filter(floor => floor.id !== floorId))
    return {
        ...plan,
        floors,
        activeFloorId: plan.activeFloorId === floorId ? floors[0].id : plan.activeFloorId,
    }
}

/** Reordering UI owns order/elevation metadata, never a possibly stale state copy. */
export function reorderDocumentFloors(plan: ProjectFloorPlan, reordered: Floor[]): ProjectFloorPlan {
    const current = new Map(plan.floors.map(floor => [floor.id, floor]))
    if (reordered.length !== current.size || new Set(reordered.map(floor => floor.id)).size !== current.size ||
        reordered.some(floor => !current.has(floor.id))) return plan
    return {
        ...plan,
        floors: reordered.map(floor => ({ ...current.get(floor.id)!, order: floor.order, elevation: floor.elevation })),
    }
}
