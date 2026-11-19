import { DEFAULT_FP, DEFAULT_SCENE_CONFIG } from '../lib/constants'
import { FloorHistory } from '../lib/floor-history'

const snapshot = (height: number) => ({
    fp: { ...structuredClone(DEFAULT_FP), roomHeight: height },
    sceneConfig: structuredClone(DEFAULT_SCENE_CONFIG),
})

test('undo and redo restore both document and material state on the intended floor', () => {
    const history = new FloorHistory()
    const initial = snapshot(2.7)
    const edited = snapshot(3.1)
    edited.sceneConfig.ambientIntensity = 0.8
    history.record('ground', initial)
    expect(history.step('upper', 'undo', snapshot(4))).toBeUndefined()
    expect(history.step('ground', 'undo', edited)).toEqual(initial)
    expect(history.step('ground', 'redo', initial)).toEqual(edited)
})

test('a completed edit after undo invalidates redo and snapshots cannot be mutated by callers', () => {
    const history = new FloorHistory()
    const initial = snapshot(2.7)
    history.record('ground', initial)
    initial.fp.roomHeight = 99
    const restored = history.step('ground', 'undo', snapshot(3.1))!
    expect(restored.fp.roomHeight).toBe(2.7)
    history.record('ground', restored)
    restored.sceneConfig.ambientIntensity = 99
    expect(history.step('ground', 'redo', restored)).toBeUndefined()
    expect(history.step('ground', 'undo', snapshot(4))!.sceneConfig.ambientIntensity)
        .toBe(DEFAULT_SCENE_CONFIG.ambientIntensity)
})

test('replacing a project clears undo and redo from all previous floors', () => {
    const history = new FloorHistory()
    history.record('ground', snapshot(2.7))
    history.record('upper', snapshot(3.1))
    history.step('upper', 'undo', snapshot(4))
    history.clear()
    expect(history.step('ground', 'undo', snapshot(4))).toBeUndefined()
    expect(history.step('upper', 'redo', snapshot(4))).toBeUndefined()
})
