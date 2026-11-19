import type { DoorStyle, FloorMaterial, WallMaterial } from './constants'
import type { PlacedLight } from '../lights-constant'

/** Canonical editor configuration. WorkspaceConfig is a derived legacy view. */
export type RoomSceneConfig = {
    roomId: string
    wallColor?: string
    wallMaterial?: WallMaterial
    floorMaterial?: FloorMaterial
    wallOverrides?: Partial<Record<'north' | 'south' | 'east' | 'west', { color?: string; material?: WallMaterial }>>
    exteriorWallColor?: string
    exteriorWallMaterial?: WallMaterial
    wallMaterialSide?: 'interior' | 'exterior' | 'both'
}

export type SceneConfig = {
    ambientIntensity: number
    wallRoughness: number
    wallTextured: boolean
    showFurniture: boolean
    showLabels: boolean
    fogEnabled: boolean
    doorStyle: DoorStyle
    globalFloorMaterial: FloorMaterial
    globalWallMaterial?: WallMaterial
    groundMaterial?: string
    rooms: RoomSceneConfig[]
    lights: PlacedLight[]
    sunToolEnabled?: boolean
    sunTimeOfDay?: number      // 0–24, default 12
    sunCompassHeading?: number // 0–360°, default 180
}
