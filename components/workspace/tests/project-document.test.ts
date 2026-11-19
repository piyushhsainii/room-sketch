import { DEFAULT_FP, DEFAULT_SCENE_CONFIG } from '../lib/constants'
import type { FloorPlanState } from '../lib/constants'
import { DEFAULT_ROOF } from '../lib/floor-data'
import type { Floor, ProjectFloorPlan } from '../lib/floor-data'
import { addDocumentFloor, deleteDocumentFloor, getActiveFloorState, reorderDocumentFloors, switchDocumentFloor, updateActiveFloor } from '../lib/project-document'
import { migrateToMultiFloor } from '../lib/migrateToMultiFloor'
import { projectFloorPlanToSceneJSON, sceneJSONToFloorPlanState } from '@/lib/workspace/floorPlanConvertor'
import { deriveFlatPlan2D } from '../lib/export/flatten2d'

function floor(id: string, order: number): Floor {
    return { id, label: id, order, elevation: order * 2.7, visible: true,
        state: structuredClone(DEFAULT_FP) }
}

function project(): ProjectFloorPlan {
    return { floors: [floor('ground', 0), floor('upper', 1)], activeFloorId: 'ground',
        viewMode: 'stacked-full', showUnderlay: true, roof: { ...DEFAULT_ROOF } }
}

const room = { id: 'study', label: 'Study', x: 1, z: 2, width: 4, depth: 3 }
const addRoom = (state: FloorPlanState): FloorPlanState => ({ ...state, rooms: [...state.rooms, room] })

test('edits survive switching, editing the other floor, and serializing every floor', () => {
    const original = project()
    const edited = updateActiveFloor(original, addRoom)
    expect(edited.floors[1]).toBe(original.floors[1])
    expect(original.floors[0].state.rooms).toEqual([])
    let plan = switchDocumentFloor(edited, 'upper')
    plan = updateActiveFloor(plan, state => ({ ...state, rooms: [{ ...room, id: 'bed', label: 'Bedroom' }] }))
    plan = switchDocumentFloor(plan, 'ground')
    expect(getActiveFloorState(plan).rooms).toEqual([room])
    const exported = projectFloorPlanToSceneJSON(plan, DEFAULT_SCENE_CONFIG)
    expect(exported.floors?.map(floor => floor.rooms[0].name)).toEqual(['Study', 'Bedroom'])
    const reloaded = sceneJSONToFloorPlanState(exported).projectFloorPlan
    expect(reloaded.activeFloorId).toBe('ground')
    expect(reloaded.floors.map(floor => floor.state.rooms[0].label)).toEqual(['Study', 'Bedroom'])
    expect(deriveFlatPlan2D(plan.floors[0].state).roomRects[0]).toMatchObject(room)
})

test('adding and deleting an active floor preserves edits and always selects a remaining floor', () => {
    const edited = updateActiveFloor(project(), addRoom)
    let plan = addDocumentFloor(edited, floor('third', 2))
    expect(plan.activeFloorId).toBe('third')
    plan = deleteDocumentFloor(plan, 'third')
    expect(plan.activeFloorId).toBe('ground')
    expect(getActiveFloorState(plan).rooms).toEqual([room])
    plan = deleteDocumentFloor(plan, 'upper')
    expect(deleteDocumentFloor(plan, 'ground')).toBe(plan)
})

test('deleting an inactive floor cannot discard the active edit', () => {
    const edited = updateActiveFloor(project(), addRoom)
    expect(getActiveFloorState(deleteDocumentFloor(edited, 'upper'))).toBe(getActiveFloorState(edited))
})

test('stale reorder metadata cannot overwrite a newer tool edit', () => {
    const initial = project()
    const stale = [...initial.floors].reverse().map((floor, order) => ({ ...floor, order }))
    const edited = updateActiveFloor(initial, addRoom)
    const reordered = reorderDocumentFloors(edited, stale)
    expect(reordered.floors.map(floor => floor.id)).toEqual(['upper', 'ground'])
    expect(getActiveFloorState(reordered).rooms).toEqual([room])
    expect(reorderDocumentFloors(edited, [stale[0], stale[0]])).toBe(edited)
})

test('height updates and restoring an undo snapshot both update stacked elevations', () => {
    const initial = project()
    const snapshot = structuredClone(getActiveFloorState(initial))
    const edited = updateActiveFloor(initial, state => ({ ...state, roomHeight: 3.5 }))
    expect(edited.floors[1].elevation).toBe(3.5)
    const restored = updateActiveFloor(edited, snapshot)
    expect(restored.floors[1].elevation).toBe(2.7)
    expect(getActiveFloorState(restored)).toEqual(snapshot)
})

test('no-op edits and invalid floor operations retain document identity for dirty tracking', () => {
    const plan = project()
    expect(updateActiveFloor(plan, state => state)).toBe(plan)
    expect(switchDocumentFloor(plan, 'missing')).toBe(plan)
    expect(deleteDocumentFloor(plan, 'missing')).toBe(plan)
    expect(addDocumentFloor(plan, plan.floors[0])).toBe(plan)
})

test('legacy drafts keep room/opening data and custom fields when wrapped as a project', () => {
    const legacy = { ...structuredClone(DEFAULT_FP), rooms: [room], customMetadata: { keep: true } }
    const plan = migrateToMultiFloor(legacy)
    const edited = updateActiveFloor(plan, state => ({ ...state, roomHeight: 3 }))
    expect(getActiveFloorState(edited)).toMatchObject({ rooms: [room], customMetadata: { keep: true } })
    expect(plan.activeFloorId).toBe('floor-ground')
})

test('room and line-wall opening anchors survive document operations and multi-floor conversion', () => {
    let plan = updateActiveFloor(project(), state => ({
        ...addRoom(state),
        lineNodes: [{ id: 'a', x: 10, z: 0 }, { id: 'b', x: 14, z: 0 }],
        lineSegments: [{ id: 'wall', nodeIds: ['a', 'b'], thickness: 0.15, closed: false }],
        openings: [
            { id: 'room-door', type: 'door', variant: 'door-swing-single', roomId: room.id,
                wall: 'north', position: 1, width: 0.9, height: 2.1, sillHeight: 0, swingDirection: 'inward' },
            { id: 'line-window', type: 'window', variant: 'window-fixed', roomId: 'wall',
                wall: 'north', position: 2, width: 1.2, height: 1.5, sillHeight: 0.8, swingDirection: 'inward',
                segmentNodeIds: ['a', 'b'], segmentT: 0.5 },
        ],
    }))
    const before = getActiveFloorState(plan)
    plan = switchDocumentFloor(switchDocumentFloor(plan, 'upper'), 'ground')
    expect(getActiveFloorState(plan)).toBe(before)
    const converted = projectFloorPlanToSceneJSON(plan, DEFAULT_SCENE_CONFIG)
    expect(converted.floors?.[0].rooms[0].doors).toHaveLength(1)
    expect(converted.floors?.[0].segment_openings).toMatchObject([
        { id: 'line-window', segment_node_ids: ['a', 'b'], segment_t: 0.5 },
    ])
    const restored = sceneJSONToFloorPlanState(converted).projectFloorPlan.floors[0].state
    expect(restored.openings).toHaveLength(2)
    expect(restored.openings.find(opening => opening.id === 'line-window')).toMatchObject({
        segmentNodeIds: ['a', 'b'], segmentT: 0.5,
    })
})
