import { DEFAULT_FP } from '../lib/constants'
import { DEFAULT_ROOF, type ProjectFloorPlan } from '../lib/floor-data'
import { applyDimensionLocks, calibrationScale, comparePlans, measureProject, measurementsCSV } from '../lib/practical-features'

function plan(): ProjectFloorPlan {
    return { floors: [{ id: 'ground', label: 'Ground Floor', order: 0, elevation: 0, visible: true,
        state: { ...structuredClone(DEFAULT_FP), rooms: [{ id: 'room', label: 'Study', x: 0, z: 0, width: 4, depth: 3 }] } }],
        activeFloorId: 'ground', viewMode: 'single', showUnderlay: false, roof: { ...DEFAULT_ROOF } }
}

test('quantities retain floor identity and exclude standalone cutouts', () => {
    const project = plan()
    project.floors.push({ ...project.floors[0], id: 'upper', label: 'Upper',
        state: { ...structuredClone(DEFAULT_FP), rooms: [{ id: 'hole', label: 'Void', x: 0, z: 0, width: 2, depth: 3, cutout: { enabled: true } }] } })
    const quantities = measureProject(project)
    expect(quantities[0].spaces[0]).toMatchObject({ area: 12, perimeter: 14 })
    expect(quantities[1].area).toBe(0)
    expect(project.floors[0].state.rooms[0].width).toBe(4)
})

test('CSV quotes names and neutralizes spreadsheet formulas', () => {
    const project = plan()
    project.floors[0].state.rooms[0].label = '=SUM(1,2)"'
    const csv = measurementsCSV(project)
    expect(csv).toContain('"\'=SUM(1,2)"""')
    expect(csv).toContain('"12.00","14.00"')
})

test('dimension locks preserve the opposite wall when resizing from the west', () => {
    const state = plan().floors[0].state
    state.rooms[0].dimensionLock = { width: 4 }
    const proposed = { ...state, rooms: [{ ...state.rooms[0], x: -2, width: 6, depth: 5 }] }
    const constrained = applyDimensionLocks(state, proposed)
    expect(constrained.rooms[0]).toMatchObject({ x: 0, width: 4, depth: 5 })
    const moved = { ...state, rooms: [{ ...state.rooms[0], x: 7 }] }
    expect(applyDimensionLocks(state, moved)).toBe(moved)
    const unlocked = { ...state, rooms: [{ ...state.rooms[0], width: 6, dimensionLock: undefined }] }
    expect(applyDimensionLocks(state, unlocked)).toBe(unlocked)
})

test('calibration uses original image pixels and rejects coincident points', () => {
    expect(calibrationScale({ x: 10, y: 10 }, { x: 310, y: 410 }, 5)).toBe(0.01)
    expect(() => calibrationScale({ x: 0, y: 0 }, { x: 0, y: 0 }, 5)).toThrow()
    expect(() => calibrationScale({ x: 0, y: 0 }, { x: 5, y: 0 }, Infinity)).toThrow()
})

test('comparison finds floor and object additions, edits and removal without mutation', () => {
    const before = plan()
    const after = structuredClone(before)
    after.floors[0].state.rooms[0].width = 8
    after.floors[0].state.annotations.push({ id: 'note', text: 'Review', x: 1, z: 2, fontSize: 12 })
    expect(comparePlans(before, after)).toMatchObject({ added: 1, changed: 1, removed: 0 })
    expect(comparePlans(before, after).changes).toEqual(expect.arrayContaining([expect.objectContaining({ label: 'Study', action: 'Changed', floor: 'Ground Floor' })]))
    expect(comparePlans(after, before)).toMatchObject({ added: 0, changed: 1, removed: 1 })
    expect(comparePlans(before, structuredClone(before))).toMatchObject({ added: 0, changed: 0, removed: 0, changes: [] })
})

test('database JSON key order does not produce false revision changes', () => {
    const before = plan()
    const reordered = JSON.parse(JSON.stringify(before, (_key, value) => {
        if (!value || typeof value !== 'object' || Array.isArray(value)) return value
        return Object.fromEntries(Object.entries(value).reverse())
    }))
    expect(comparePlans(before, reordered)).toMatchObject({ added: 0, changed: 0, removed: 0 })
})

test('wall normalization preserves the same comparison edges', () => {
    const before = plan()
    before.floors[0].state.lineSegments = [{ id: 'polyline', nodeIds: ['a', 'b', 'c'], thickness: 0.15, closed: false }]
    const after = structuredClone(before)
    after.floors[0].state.lineSegments = [
        { id: 'first', nodeIds: ['a', 'b'], thickness: 0.15, closed: false },
        { id: 'second', nodeIds: ['b', 'c'], thickness: 0.15, closed: false },
    ]
    expect(comparePlans(before, after)).toMatchObject({ added: 0, removed: 0, changed: 0 })
})
