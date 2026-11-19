import {
    DEFAULT_FP,
    DEFAULT_SCENE_CONFIG,
    type EditorOpening,
    type EditorRoom,
} from '../workspace/lib/constants'
import type { FurnitureType, PlacedFurniture } from '../workspace/lib/furniture-constants'
import { migrateToMultiFloor } from '../workspace/lib/migrateToMultiFloor'
import type { RoomSceneConfig } from '../workspace/lib/scene-config'

type Wall = EditorOpening['wall']
type FurniturePlacement = [type: FurnitureType, x: number, z: number, rotation?: number, scale?: number]

function room(id: string, label: string, x: number, z: number, width: number, depth: number): EditorRoom {
    return { id, label, x, z, width, depth, wallThickness: 0.12 }
}

function opening(roomId: string, wall: Wall, position: number, type: 'door' | 'opening' | 'window', width: number): EditorOpening {
    return {
        id: `${roomId}-${wall}-${type}-${position}`,
        roomId, wall, position, type, width,
        variant: { door: 'door-swing-single', opening: 'opening-rect', window: 'window-fixed' }[type],
        height: type === 'window' ? 1.4 : 2.1,
        sillHeight: type === 'window' ? 0.9 : 0,
        swingDirection: 'inward',
    }
}

// Shared partitions have a matching opening on the other room's wall.
function passage(
    first: [EditorRoom, Wall, number],
    second: [EditorRoom, Wall, number],
    width = 0.9,
    type: 'door' | 'opening' = 'door',
) {
    const [roomA, wallA, positionA] = first
    const [roomB, wallB, positionB] = second
    return [
        opening(roomA.id, wallA, positionA, type, width),
        opening(roomB.id, wallB, positionB, 'opening', width),
    ]
}

function createResidence(
    rooms: EditorRoom[],
    openings: EditorOpening[],
    placements: FurniturePlacement[],
    finishes: RoomSceneConfig[],
) {
    const furniture: PlacedFurniture[] = placements.map(([type, x, z, rotation = 0, scale = 1], index) => ({
        id: `furniture-${index}`, type, x, z, rotation, scale,
        finishPalette: { wood: '#ba9876', upholstery: '#839d90', metal: '#414746' },
    }))
    const plan = migrateToMultiFloor({
        ...structuredClone(DEFAULT_FP),
        roomHeight: 2.8,
        rooms, openings, furniture,
        lights: rooms.map(({ id, x, z, width, depth }) => ({
            id: `${id}-light`, type: 'ceiling_recessed',
            x: x + width / 2, z: z + depth / 2, heightOffset: 2.65,
            color: '#fff4e6', intensity: 3, scale: 1, castShadow: false,
        })),
    })
    return {
        plan,
        sceneConfig: {
            ...structuredClone(DEFAULT_SCENE_CONFIG),
            ambientIntensity: 0.85,
            wallTextured: true,
            doorStyle: 'wood_oak' as const,
            globalFloorMaterial: 'wood-oak' as const,
            rooms: finishes,
        },
    }
}

export function createStudioApartment() {
    const studio = room('studio', 'Living, kitchen & sleeping', 0, 0, 7, 4.5)
    const bath = room('studio-bath', 'Bathroom', 0, 4.5, 2.4, 2.3)
    const entry = room('studio-entry', 'Entry', 2.4, 4.5, 4.6, 2.3)

    return createResidence([studio, bath, entry], [
        ...passage([studio, 'south', 4.8], [entry, 'north', 2.4], 1.8, 'opening'),
        ...passage([bath, 'east', 1.65], [entry, 'west', 1.65], 0.8),
        opening(entry.id, 'south', 3.6, 'door', 0.95),
        opening(studio.id, 'north', 1.6, 'window', 1.8),
        opening(studio.id, 'east', 2.7, 'window', 2.1),
        opening(bath.id, 'west', 0.7, 'window', 0.65),
    ], [
        ['bed_double', 1.5, 1.55], ['side_table', 2.9, 1.45],
        ['wardrobe', 0.62, 3.75, Math.PI / 2, 0.8],
        ['sofa', 6.37, 2.75, -Math.PI / 2, 0.82], ['coffee_table', 5.15, 2.72, Math.PI / 2, 0.8],
        ['kitchen_fridge', 3.45, 0.52], ['kitchen_cabinet_base', 4.3, 0.5],
        ['kitchen_sink', 5.15, 0.5], ['kitchen_stove', 6.05, 0.5],
        ['plant', 6.52, 4.12], ['shower', 0.72, 5.2], ['toilet', 1.75, 5.08],
        ['shoe_rack', 3.8, 6.3, 0, 0.66],
    ], [
        { roomId: studio.id, wallColor: '#f0efe7', wallOverrides: { north: { color: '#c6d3c7' } } },
        { roomId: bath.id, floorMaterial: 'tile-ceramic', wallColor: '#f0efe7' },
        { roomId: entry.id, wallColor: '#f0efe7' },
    ])
}

export function createFamilyHome() {
    const living = room('family-living', 'Living room', 0, 0, 5, 4.5)
    const kitchen = room('family-kitchen', 'Kitchen & dining', 7, 0, 5, 4.5)
    const hall = room('family-hall', 'Entry & hallway', 5, 0, 2, 11)
    const firstBed = room('family-bedroom-1', 'Bedroom 2', 0, 4.5, 5, 3)
    const secondBed = room('family-bedroom-2', 'Bedroom 3', 0, 7.5, 5, 3.5)
    const mainBed = room('family-primary', 'Primary bedroom', 7, 7, 5, 4)
    const bath = room('family-bath', 'Bathroom', 7, 4.5, 5, 2.5)

    return createResidence([living, kitchen, hall, firstBed, secondBed, mainBed, bath], [
        ...passage([living, 'east', 2.3], [hall, 'west', 2.3], 1.5, 'opening'),
        ...passage([kitchen, 'west', 2.3], [hall, 'east', 2.3], 1.4, 'opening'),
        ...passage([firstBed, 'east', 1.5], [hall, 'west', 6]),
        ...passage([secondBed, 'east', 1.2], [hall, 'west', 8.7]),
        ...passage([bath, 'west', 1.25], [hall, 'east', 5.75]),
        ...passage([mainBed, 'west', 1.6], [hall, 'east', 8.6]),
        opening(hall.id, 'north', 1, 'door', 1),
        opening(living.id, 'north', 2.5, 'window', 2.6),
        opening(kitchen.id, 'east', 2.4, 'window', 2),
        opening(firstBed.id, 'west', 1.5, 'window', 1.55),
        opening(secondBed.id, 'south', 2.3, 'window', 1.8),
        opening(mainBed.id, 'south', 2.5, 'window', 2.3),
        opening(bath.id, 'east', 1.25, 'window', 0.85),
    ], [
        ['sofa', 2.22, 0.77], ['coffee_table', 2.2, 2.1],
        ['single_sofa', 1.05, 3.45, Math.PI / 2], ['plant', 4.25, 3.8],
        ['kitchen_fridge', 7.6, 0.55], ['kitchen_cabinet_base', 8.47, 0.54],
        ['kitchen_sink', 9.35, 0.54], ['kitchen_stove', 10.23, 0.54],
        ['dining_table', 9.8, 2.85, 0, 0.87],
        ['chair', 8.45, 2.85, Math.PI / 2], ['chair', 11.15, 2.85, -Math.PI / 2],
        ['chair', 9.8, 1.96], ['chair', 9.8, 3.72, Math.PI],
        ['bed_single', 1.05, 5.95], ['desk', 3.1, 5.04, 0, 0.75],
        ['desk_chair', 3.1, 5.95, Math.PI, 0.82], ['wardrobe', 3.55, 6.91, Math.PI, 0.75],
        ['bed_single', 1.05, 9.05], ['desk', 3.15, 10.45, Math.PI, 0.75],
        ['desk_chair', 3.15, 9.55, 0, 0.82], ['wardrobe', 3.4, 8.05, 0, 0.75],
        ['bed_double', 9.75, 8.55], ['side_table', 8.22, 7.67], ['side_table', 11.28, 7.67],
        ['wardrobe', 11.34, 10.11, -Math.PI / 2, 0.85], ['bathtub', 10.79, 5.17],
        ['toilet', 8.8, 5.02],
    ], [
        { roomId: living.id, wallColor: '#f3ede2', wallOverrides: { south: { color: '#d2dbce' } } },
        { roomId: kitchen.id, wallColor: '#f1eee6', floorMaterial: 'tile-ceramic' },
        { roomId: hall.id, wallColor: '#f3ede2' },
        { roomId: firstBed.id, wallColor: '#e5ebe4' },
        { roomId: secondBed.id, wallColor: '#f1e5df' },
        { roomId: mainBed.id, wallColor: '#eee9e0', wallOverrides: { north: { color: '#ccc7b8' } } },
        { roomId: bath.id, wallColor: '#ebefed', floorMaterial: 'tiles' },
    ])
}
