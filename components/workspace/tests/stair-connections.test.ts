import { DEFAULT_FP } from '../lib/constants'
import type { Floor } from '../lib/floor-data'
import { getStairConnections, withStairOpenings } from '../lib/stair-connections'

function levels(): Floor[] {
    return [0, 1, 2].map(index => ({ id: 'level-' + index, order: index, label: 'Level ' + index,
        elevation: index * 3.2, visible: true, state: structuredClone(DEFAULT_FP) }))
}

test('legacy stairs infer the next elevation and explicit destinations remain authoritative', () => {
    const floors = levels()
    floors[0].state.stairs = [{ id: 'stairs', type: 'stairs-straight', x: 2, z: 3, width: 1.3, depth: 6, rotation: 0 }]
    expect(getStairConnections(floors)[0].destination.id).toBe('level-1')
    floors[0].state.stairs[0].toLevel = 'level-2'
    expect(getStairConnections(floors)[0].destination.id).toBe('level-2')
    floors[0].state.stairs[0].toLevel = 'deleted-floor'
    expect(getStairConnections(floors)).toEqual([])
})

test('destination cutouts are derived once without changing the saved document', () => {
    const floors = levels()
    floors[0].state.stairs = [{ id: 'stairs', type: 'stairs-straight', x: 2, z: 3, width: 1.3, depth: 6, rotation: Math.PI / 2 }]
    const connections = getStairConnections(floors)
    const result = withStairOpenings(floors[1].state, connections, floors[1].id)
    expect(result.closedShapes).toHaveLength(1)
    expect(result.lineNodes).toHaveLength(4)
    expect(floors[1].state.closedShapes).toHaveLength(0)
    expect(withStairOpenings(result, connections, floors[1].id).closedShapes).toHaveLength(1)
    floors[0].state.stairs[0].autoCutout = false
    expect(withStairOpenings(floors[1].state, connections, floors[1].id)).toBe(floors[1].state)
})
