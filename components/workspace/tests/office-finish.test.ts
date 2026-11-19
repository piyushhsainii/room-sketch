import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { createOfficeDemo } from '../../dashboard/officeDemo'
import { finishModernOffice } from '../../dashboard/officeFinish'
import { MATERIAL_REGISTRY } from '../lib/constants'
import { canonicalJSON } from '../lib/practical-features'
import { getStairConnections, withStairOpenings } from '../lib/stair-connections'

test('office finishes preserve edits, connect alternate flights and are safe to apply twice', () => {
    const original = createOfficeDemo()
    original.plan.floors[1].state.furniture[0].x = 2.7
    const before = canonicalJSON(original)
    const finished = finishModernOffice(original.plan, original.sceneConfig)
    expect(canonicalJSON(original)).toBe(before)
    expect(finished.plan.floors[1].state.furniture[0].x).toBe(2.7)
    const connections = getStairConnections(finished.plan.floors)
    expect(connections).toHaveLength(2)
    expect(connections[0].stair.x).not.toBe(connections[1].stair.x)
    for (const floor of finished.plan.floors.slice(1)) {
        expect(floor.state.closedShapes.filter(shape => shape.cutout?.enabled)).toHaveLength(1)
        expect(withStairOpenings(floor.state, connections, floor.id).closedShapes).toHaveLength(1)
    }
    expect(canonicalJSON(finishModernOffice(finished.plan, finished.sceneConfig))).toBe(canonicalJSON(finished))
    expect(finished.plan.floors[0].state.wallDecor.some(item => item.text?.includes('ROOMSKETCH'))).toBe(true)
})

test('office finish textures resolve to real local PBR assets', () => {
    const finished = finishModernOffice(...(() => { const demo = createOfficeDemo(); return [demo.plan, demo.sceneConfig] as const })())
    const materialIds = new Set(['wood-oak', 'wood-slat-oak', ...finished.sceneConfig.rooms.map(room => room.floorMaterial!)])
    for (const id of materialIds) {
        const material = MATERIAL_REGISTRY[id]
        expect(material).toBeDefined()
        for (const path of [material.textureUrl, material.normalMapUrl, material.roughnessMapUrl].filter(Boolean)) {
            expect(existsSync(join(process.cwd(), 'public', path!))).toBe(true)
        }
    }
})
