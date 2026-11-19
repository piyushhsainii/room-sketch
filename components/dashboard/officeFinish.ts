import type { ProjectFloorPlan } from '../workspace/lib/floor-data'
import type { SceneConfig, RoomSceneConfig } from '../workspace/lib/scene-config'
import type { PlacedFurniture } from '../workspace/lib/furniture-constants'
import { stairCutoutFootprint } from '../workspace/lib/stairs-constants'

export const OFFICE_PALETTE = { wood: '#b59168', upholstery: '#49665d', metal: '#292e30' }

/** A reversible finish pass: retain the user's rooms, furniture edits and IDs. */
export function finishModernOffice(current: ProjectFloorPlan, currentConfig: SceneConfig) {
    const plan = structuredClone(current)
    const sceneConfig = structuredClone(currentConfig)
    const floors = [...plan.floors].sort((a, b) => a.elevation - b.elevation)
    if (floors.length !== 3 || !floors.every(floor => floor.id.startsWith('office-'))) {
        throw new Error('This finish package is for the three-floor office example.')
    }
    const roomConfigs: RoomSceneConfig[] = []
    for (const [index, floor] of floors.entries()) {
        const fp = floor.state
        // Replace only the example's old stair void. Other authored geometry stays intact.
        const oldNodeIds = new Set(fp.closedShapes.filter(shape => shape.id === floor.id + '-cutout' || shape.id === floor.id + '-modern-void').flatMap(shape => shape.nodeIds))
        fp.closedShapes = fp.closedShapes.filter(shape => shape.id !== floor.id + '-cutout' && shape.id !== floor.id + '-modern-void')
        fp.lineSegments = fp.lineSegments.filter(segment => segment.id !== floor.id + '-void')
        fp.lineNodes = fp.lineNodes.filter(node => !oldNodeIds.has(node.id))
        fp.tracingImage = undefined // The initial schematic is no longer the presentation surface.
        fp.furniture = fp.furniture.map(item => finishFurniture(item))
        const add = (item: PlacedFurniture) => {
            if (!fp.furniture.some(existing => existing.id === item.id)) fp.furniture.push(finishFurniture(item))
        }
        if (index === 0) {
            add({ id: 'modern-reception-chair', type: 'single_sofa', x: 5.7, z: 3.6, rotation: -Math.PI / 2, scale: 1 })
            add({ id: 'modern-meeting-console', type: 'bookcase', x: 18.9, z: 12.6, rotation: 0, scale: 1 })
        }
        if (index === 2) {
            add({ id: 'modern-lounge-side-table', type: 'side_table', x: 13.6, z: 10.8, rotation: 0, scale: 1 })
            add({ id: 'modern-reading-lamp', type: 'lamp', x: 5.9, z: 11.5, rotation: 0, scale: 1 })
        }
        // Alternating flights share a landing, without occupying the same shaft.
        fp.stairs = fp.stairs.map(stair => stair.id === floor.id + '-stairs' && index < floors.length - 1 ? {
            ...stair, x: index === 0 ? 8.45 : 10.15, z: 4.5, width: 1.3, depth: 6,
            rotation: index === 0 ? 0 : Math.PI, rise: floors[index + 1].elevation - floor.elevation,
            steps: 19, fromLevel: floor.id, toLevel: floors[index + 1].id,
            openingMode: 'destination', autoCutout: true, openingOffset: 0.08,
            materialId: 'wood-oak', tread: { mode: 'closed', thickness: 0.045 },
            railing: { enabled: true, style: 'glass', color: '#292e30', height: 1.05, side: 'both', postSpacing: 1.2, railingWidth: 0.035 },
            skirt: { enabled: false, perFlight: [] },
        } : stair)
        for (const room of fp.rooms) {
            const prior = sceneConfig.rooms.find(config => config.roomId === room.id)
            const hall = room.id.endsWith('-hall')
            const soft = /studio|engineering|focus|training|library/.test(room.id)
            const floorMaterial = hall || room.id === 'cafe' ? 'concrete' : soft ? 'carpet-woven' : 'wood-oak'
            roomConfigs.push({ ...prior, roomId: room.id, floorMaterial, wallColor: '#ece9e1', wallMaterial: 'paint',
                wallOverrides: { ...prior?.wallOverrides,
                    north: { material: room.id === 'reception' || room.id === 'executive' ? 'wood-slat-oak' : 'paint', color: '#344e47' },
                    south: { material: 'paint', color: hall ? '#ece9e1' : '#d7d8ce' } } })
        }
        fp.wallDecor = fp.wallDecor.filter(item => !item.id.startsWith('modern-office-'))
        const featureRoom = fp.rooms.find(room => room.id === ['reception', 'boardroom', 'executive'][index])!
        fp.wallDecor.push({ id: 'modern-office-brand-' + floor.id, type: 'painting', roomId: featureRoom.id,
            wall: 'north', position: featureRoom.width / 2, heightOffset: 1.85, width: 2.8, scale: 1,
            text: index === 0 ? 'ROOMSKETCH' : index === 1 ? 'CREATE TOGETHER' : 'IDEAS INTO SPACE',
            subtitle: ['STUDIO / WORKPLACE', '02 / WORK & FOCUS', '03 / LEARNING & LOUNGE'][index], backgroundColor: '#344e47' })
        const meetingRoom = fp.rooms.find(room => room.id === ['meeting', 'boardroom', 'training'][index])!
        fp.wallDecor.push({ id: 'modern-office-screen-' + floor.id, type: 'led_tv', roomId: meetingRoom.id,
            wall: 'south', position: meetingRoom.width / 2, heightOffset: 1.65, width: 1.8, scale: 1 })
        // Warm ceiling fixtures: two per long occupied room, no extra shadow maps.
        fp.lights = fp.lights.filter(light => !light.id.startsWith('modern-office-'))
            .map(light => ({ ...light, color: '#fff1d9', intensity: 5, castShadow: false }))
        for (const room of fp.rooms.filter(room => room.depth >= 8 && !room.id.endsWith('-hall'))) {
            fp.lights.push({ id: 'modern-office-light-' + room.id, type: 'ceiling_recessed', x: room.x + room.width / 2,
                z: room.z + room.depth * 0.25, heightOffset: fp.roomHeight - 0.15, color: '#fff1d9', intensity: 5, castShadow: false, scale: 1 })
        }
    }
    // Persist real openings too, so the 2D editor exposes the same stair shaft.
    for (const [index, floor] of floors.entries()) {
        if (index === 0) continue
        const stair = floors[index - 1].state.stairs.find(stair => stair.toLevel === floor.id)
        if (!stair) continue
        const id = floor.id + '-modern-void'
        const nodes = stairCutoutFootprint(stair).map((point, i) => ({ ...point, id: id + '-node-' + i }))
        floor.state.lineNodes.push(...nodes)
        floor.state.closedShapes.push({ id, label: 'Stairwell · floor below', nodeIds: nodes.map(node => node.id), cutout: { enabled: true,
            guard: { enabled: true, type: 'railing', height: 1.05, railingStyle: 'glass', railingColor: '#292e30',
                railingPostSpacing: 1.2, railingWidthDim: 0.035,
                // The stair exits across its local far edge. Leave that landing open.
                edgeOverrides: { [id + '::guard::2']: { type: 'open' } } } } })
    }
    sceneConfig.rooms = [...sceneConfig.rooms.filter(config => !roomConfigs.some(room => room.roomId === config.roomId)), ...roomConfigs]
    Object.assign(sceneConfig, { wallTextured: true, wallRoughness: 0.78, ambientIntensity: 0.7,
        globalFloorMaterial: 'wood-oak', doorStyle: 'wood_oak', sunToolEnabled: true, sunTimeOfDay: 10, sunCompassHeading: 145 })
    plan.showUnderlay = false
    plan.viewMode = 'single'
    return { plan, sceneConfig }
}

function finishFurniture(item: PlacedFurniture): PlacedFurniture {
    const heights: Record<string, number> = { desk: 0.74, dining_table: 0.75, coffee_table: 0.4,
        desk_chair: 1.05, chair: 0.85, sofa: 0.82, sofa_l: 0.82, single_sofa: 0.86,
        lounge_recliner: 0.88, bookcase: 1.8, kitchen_cabinet_base: 0.9, kitchen_sink: 0.92,
        kitchen_fridge: 1.9, side_table: 0.5, lamp: 1.5 }
    return { ...item, variant: 'modern', finishPalette: { ...OFFICE_PALETTE },
        targetHeight: heights[item.type] ?? item.targetHeight, workstation: item.type === 'desk',
        ...(item.type === 'desk_chair' ? { materialId: undefined } : {}) }
}
