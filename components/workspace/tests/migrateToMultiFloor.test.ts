import { DEFAULT_FP } from '../lib/constants'
import type { FloorPlanState } from '../lib/constants'
import { migrateToMultiFloor, recomputeFloorElevations } from '../lib/migrateToMultiFloor'

test('legacy windows receive defaults without mutating the source or dropping extension fields', () => {
    const source = { ...structuredClone(DEFAULT_FP), customField: 'retained', openings: [{
        id: 'window', type: 'window' as const, roomId: 'room', wall: 'north' as const,
        position: 1, width: 1.2, height: 1.5, isOpen: true,
    }] }
    // Serialized older windows predate fields required by the current editor type.
    const migrated = migrateToMultiFloor(source as unknown as FloorPlanState)
    expect(migrated.floors[0].state).toMatchObject({ customField: 'retained', openings: [{
        variant: 'window-fixed', isOpen: true, openAmount: 1,
    }] })
    expect(source.openings[0]).not.toHaveProperty('variant')
    expect(migrateToMultiFloor(migrated)).toEqual(migrated)
})

test('existing project and floor metadata survive migration', () => {
    const initial = migrateToMultiFloor(structuredClone(DEFAULT_FP))
    const source = { ...initial, customProjectField: true, floors: initial.floors.map(floor => ({
        ...floor, customFloorField: 'retained', state: { ...floor.state, roomHeight: 3.1 },
    })) }
    const migrated = migrateToMultiFloor(source)
    expect(migrated).toMatchObject({ customProjectField: true, floors: [{ customFloorField: 'retained' }] })
    expect(migrated.activeFloorId).toBe(source.activeFloorId)
    expect(migrated.floors[0].state.roomHeight).toBe(3.1)
})

test('elevations stack by height and respect the existing explicit override contract', () => {
    const ground = migrateToMultiFloor({ ...structuredClone(DEFAULT_FP), roomHeight: 3 }).floors[0]
    const upper = { ...ground, id: 'upper', order: 1, elevation: 5 }
    expect(recomputeFloorElevations([upper, ground]).map(floor => floor.elevation)).toEqual([0, 3])
    expect(recomputeFloorElevations([ground, upper], new Set(['upper']))[1].elevation).toBe(5)
    expect(upper.elevation).toBe(5)
})
