// Add to stairs-constants.ts (or wherever PlacedStairs is defined)

export type TreadStyleMode = 'closed' | 'floating'

export interface TreadConfig {
    /** 'closed' = solid stacked stair, each riser filled (image: chevron wood staircase).
     *  'floating' = open-riser treads with a visible gap beneath (image: cantilevered wood-on-steel-stringer). */
    mode: TreadStyleMode
    /** Override the tread's run/depth in meters. Falls back to the auto-computed run if omitted. */
    depth?: number
    /** Override the tread's thickness (vertical) in meters. Falls back to riser*0.9 if omitted. */
    thickness?: number
    /** Vertical air gap under each tread when mode='floating'. Ignored in 'closed' mode. */
    gap?: number
}

export const DEFAULT_TREAD: TreadConfig = {
    mode: 'floating',
    gap: 0.03,
}

export interface RailingConfig {
    enabled: boolean
    side: 'left' | 'right' | 'both' | 'none'
    style: 'baluster' | 'glass' | 'cable' | 'solid-panel' | 'criss-cross'
    height: number
    postSpacing?: number
    railingWidth?: number
    materialId?: string
    color?: string
}

// sides scoped as 'left' | 'right' | 'front' per flight index rather than
// one global side-set — avoids the L/U ambiguity flagged earlier (flight 2
// of an L-stair has a different "left" than flight 1).
export interface SkirtSide {
    flightIndex: number
    sides: ('left' | 'right' | 'front')[]
}

export interface SkirtConfig {
    enabled: boolean
    perFlight: SkirtSide[]
    materialId?: string
    color?: string
}

export const DEFAULT_SKIRT: SkirtConfig = {
    enabled: false,
    perFlight: [],
}

// migrateStairsToFlights() (Phase 1) should also backfill these two fields
// for any stair placed before this change, so old saves keep their current
// always-on railing look instead of silently losing railings.
export function migrateStairRailingSkirt(s: any) {
    if (!s.railing) {
        s.railing = {
            ...DEFAULT_RAILING,
            enabled: s.railingEnabled ?? true,
            color: s.railingColor ?? '#6B5B4E',
            height: s.railingHeight ?? 0.9,
        }
    }
    if (!s.skirt) {
        s.skirt = { ...DEFAULT_SKIRT }
    }
    return s
}

// Same backfill pattern as migrateStairRailingSkirt, for stairs placed
// before the tread-style (gap/no-gap, custom depth/thickness) change.
// Old saves get DEFAULT_TREAD, which reproduces the previous always-open
// baseline look (`floating`, 0.03 gap) so nothing visually jumps.
export function migrateStairTread(s: any) {
    if (!s.tread) {
        s.tread = { ...DEFAULT_TREAD }
    }
    return s
}

export interface RailingPathSegment {
    start: number          // local x, run start
    end: number             // local x, run end
    elevationDelta: number  // y at `end` minus y at `start`
    startElevation?: number // y at `start` (defaults to running total from previous segment, 0 for first)
}

export interface RailingStyleConfig {
    style?: 'baluster' | 'glass' | 'cable' | 'solid-panel' | 'criss-cross'
    postSpacing?: number   // baluster/cable spacing target (m)
    railingWidth?: number  // thickness/profile of the top rail + posts
}

// A single side's full railing spec — same shape as the fields already on
// RailingConfig, but now expressible per flight+side instead of only once
// globally.
export interface RailingSideConfig {
    enabled: boolean
    style: 'baluster' | 'glass' | 'cable' | 'solid-panel' | 'criss-cross'
    height: number
    color?: string
    postSpacing?: number
    railingWidth?: number
}

export interface FlightRailingConfig {
    flightIndex: number
    left?: RailingSideConfig
    right?: RailingSideConfig
}

export interface RailingConfig {
    enabled: boolean
    side: 'left' | 'right' | 'both' | 'none'
    style: 'baluster' | 'glass' | 'cable' | 'solid-panel' | 'criss-cross'
    height: number
    postSpacing?: number
    railingWidth?: number
    materialId?: string
    color?: string
    perFlight?: FlightRailingConfig[]
}

export const DEFAULT_RAILING: RailingConfig = {
    enabled: true,
    side: 'both',
    style: 'baluster',
    height: 0.9,
    postSpacing: 0.12,
    railingWidth: 0.05,
}

export function resolveFlightRailing(
    railing: RailingConfig,
    flightIndex: number,
    side: 'left' | 'right',
): RailingSideConfig | null {
    if (!railing.enabled) return null

    const override = railing.perFlight?.find(p => p.flightIndex === flightIndex)?.[side]
    if (override) {
        return override.enabled ? override : null
    }

    if (railing.side === 'none') return null
    if (railing.side !== 'both' && railing.side !== side) return null

    return {
        enabled: true,
        style: railing.style,
        height: railing.height,
        color: railing.color,
        postSpacing: railing.postSpacing,
        railingWidth: railing.railingWidth,
    }
}