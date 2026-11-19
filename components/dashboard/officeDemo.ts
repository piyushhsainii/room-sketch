import { DEFAULT_FP, DEFAULT_SCENE_CONFIG, type EditorRoom, type FloorPlanState } from '../workspace/lib/constants'
import type { Floor, ProjectFloorPlan } from '../workspace/lib/floor-data'
import type { PlacedFurniture, FurnitureType } from '../workspace/lib/furniture-constants'

/** A furnished, repeatable example created through the normal template entry. */
export function createOfficeDemo(): { plan: ProjectFloorPlan; sceneConfig: typeof DEFAULT_SCENE_CONFIG } {
    const room = (id: string, label: string, x: number, z: number, width: number, depth: number): EditorRoom =>
        ({ id, label, x, z, width, depth, wallThickness: 0.12 })
    const layouts = [
        [room('reception', 'Reception & waiting', 0, 0, 8, 5), room('studio', 'Design studio · 6 seats', 0, 5, 8, 9),
            room('cafe', 'Kitchen & cafe', 12, 0, 8, 5), room('meeting', 'Client meeting room', 12, 5, 8, 9)],
        [room('engineering', 'Engineering · 6 seats', 0, 0, 8, 9), room('focus', 'Quiet focus room', 0, 9, 8, 5),
            room('boardroom', 'Boardroom', 12, 0, 8, 6), room('management', 'Management offices', 12, 6, 8, 8)],
        [room('training', 'Training & workshops', 0, 0, 8, 9), room('library', 'Library & reading', 0, 9, 8, 5),
            room('executive', 'Executive office', 12, 0, 8, 6), room('lounge', 'Team lounge', 12, 6, 8, 8)],
    ]
    const floors: Floor[] = layouts.map((rooms, index) => {
        const prefix = 'office-' + index
        const furniture: PlacedFurniture[] = []
        const place = (type: FurnitureType, x: number, z: number, rotation = 0, scale = 1) => {
            furniture.push({ id: prefix + '-item-' + furniture.length, type, x, z, rotation, scale })
        }
        const desks = (x: number, z: number, columns: number, rows: number) => {
            for (let row = 0; row < rows; row++) {
                for (let column = 0; column < columns; column++) {
                    const dx = x + column * 3.1, dz = z + row * 2.7
                    place('desk', dx, dz)
                    place('desk_chair', dx, dz + 0.85, Math.PI)
                }
            }
        }
        if (index === 0) {
            place('desk', 3.8, 1.4, Math.PI)
            place('desk_chair', 3.8, 0.7)
            place('sofa', 2.3, 3.8)
            place('coffee_table', 2.3, 2.9)
            desks(2.1, 6.8, 2, 3)
            place('bookcase', 6.9, 12.8)
            place('kitchen_cabinet_base', 14, 0.7)
            place('kitchen_sink', 16, 0.7)
            place('kitchen_fridge', 18.9, 0.8)
            place('dining_table', 16.5, 3.3)
            place('chair', 15, 3.3, Math.PI / 2)
            place('chair', 18, 3.3, -Math.PI / 2)
            place('dining_table', 16, 9)
            for (const x of [14.6, 17.4]) for (const z of [7.8, 9.2, 10.6]) place('chair', x, z, x < 16 ? Math.PI / 2 : -Math.PI / 2)
        } else if (index === 1) {
            desks(2.1, 1.8, 2, 3)
            desks(2, 10.8, 2, 1)
            place('bookcase', 6.8, 13)
            place('dining_table', 16, 3, 0, 1.25)
            for (const x of [14.4, 17.6]) for (const z of [1.8, 3, 4.2]) place('chair', x, z, x < 16 ? Math.PI / 2 : -Math.PI / 2)
            desks(14, 8.1, 2, 1)
            place('sofa', 16, 12)
            place('coffee_table', 16, 10.8)
        } else {
            desks(2, 1.8, 2, 3)
            place('bookcase', 1.2, 12.9)
            place('bookcase', 6.8, 12.9)
            place('lounge_recliner', 3, 11)
            place('lounge_recliner', 5, 11)
            place('desk', 16, 2)
            place('desk_chair', 16, 2.9, Math.PI)
            place('sofa', 16, 4.6)
            place('sofa_l', 15.5, 9)
            place('coffee_table', 16, 10.3)
            place('dining_table', 16.5, 12.4)
            place('chair', 15, 12.4, Math.PI / 2)
            place('chair', 18, 12.4, -Math.PI / 2)
        }
        for (const [x, z] of [[0.9, 0.9], [7, 13], [19, 13], [19, 4.2]]) place('plant', x, z)
        const hall = room(prefix + '-hall', 'Circulation & stairs', 8, 0, 4, 14)
        const state: FloorPlanState = {
            ...structuredClone(DEFAULT_FP), roomHeight: 3.2, rooms: [...rooms, hall], furniture,
            openings: rooms.flatMap((item, i) => [{
                id: prefix + '-door-' + i, roomId: item.id, type: 'door' as const,
                variant: 'door-swing-single', position: Math.min(2, item.depth / 2), width: 1.1, height: 2.2,
                sillHeight: 0, swingDirection: 'inward' as const, wall: item.x === 0 ? 'east' as const : 'west' as const,
            }, {
                id: prefix + '-window-' + i, roomId: item.id, type: 'window' as const,
                variant: 'window-fixed', position: Math.min(3, item.depth / 2), width: 2.4, height: 1.5,
                sillHeight: 0.8, swingDirection: 'inward' as const, wall: item.x === 0 ? 'west' as const : 'east' as const,
            }]),
            lights: rooms.map((item, i) => ({
                id: prefix + '-light-' + i, type: 'ceiling_recessed', x: item.x + item.width / 2,
                z: item.z + item.depth / 2, heightOffset: 3, color: '#fff4e6', intensity: 3,
                castShadow: i === 0, scale: 1,
            })),
        }
        // Matching openings in the hall wall make every room accessible.
        state.openings.push(...rooms.map((item, i) => ({
            ...state.openings[i * 2], id: prefix + '-hall-door-' + i, roomId: hall.id,
            wall: item.x === 0 ? 'west' as const : 'east' as const, position: item.z + Math.min(2, item.depth / 2),
            variant: 'opening-rect', type: 'opening' as const,
        })))
        if (index < 2) state.stairs = [{
            id: prefix + '-stairs', type: 'stairs-straight', x: 9.25, z: 5,
            width: 1.5, depth: 6, rotation: 0, rise: 3.2, steps: 18,
        }]
        if (index > 0) {
            state.lineNodes = [{ id: prefix + '-a', x: 9.2, z: 4.9 }, { id: prefix + '-b', x: 10.8, z: 4.9 },
                { id: prefix + '-c', x: 10.8, z: 11.1 }, { id: prefix + '-d', x: 9.2, z: 11.1 }]
            state.lineSegments = [{ id: prefix + '-void', nodeIds: state.lineNodes.map(node => node.id), closed: true, thickness: 0.1, wallType: 'open' }]
            state.closedShapes = [{ id: prefix + '-cutout', nodeIds: state.lineNodes.map(node => node.id), label: 'Stair opening', cutout: { enabled: true } }]
        }
        return { id: prefix, label: ['Ground · Welcome & clients', 'Level 2 · Work & focus', 'Level 3 · Learning & lounge'][index],
            order: index, elevation: index * 3.2, visible: true, state }
    })
    return { plan: { floors, activeFloorId: floors[0].id, viewMode: 'single', showUnderlay: false, roof: { type: 'none', visible: false } },
        sceneConfig: { ...structuredClone(DEFAULT_SCENE_CONFIG), ambientIntensity: 1.1,
            rooms: floors.flatMap(floor => floor.state.rooms.map(item => ({
                roomId: item.id, wallColor: '#f2f0ea', floorMaterial: 'plain' as const,
            }))) } }
}
