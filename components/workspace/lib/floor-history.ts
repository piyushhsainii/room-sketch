import type { FloorPlanState } from './constants'
import type { SceneConfig } from './scene-config'

export type HistoryEntry = { fp: FloorPlanState; sceneConfig: SceneConfig }
type History = { past: HistoryEntry[]; future: HistoryEntry[] }

/** Completed editor actions remain independent for each floor. */
export class FloorHistory {
    private readonly floors = new Map<string, History>()

    clear() {
        this.floors.clear()
    }

    record(floorId: string, entry: HistoryEntry) {
        const history = this.floors.get(floorId) ?? { past: [], future: [] }
        history.past.push(structuredClone(entry))
        history.future.length = 0
        this.floors.set(floorId, history)
    }

    step(floorId: string, direction: 'undo' | 'redo', current: HistoryEntry): HistoryEntry | undefined {
        const history = this.floors.get(floorId)
        if (!history) return
        const source = direction === 'redo' ? history.future : history.past
        const destination = direction === 'redo' ? history.past : history.future
        const snapshot = source.pop()
        if (!snapshot) return
        destination.push(structuredClone(current))
        return snapshot
    }
}
