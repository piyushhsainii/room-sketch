import { useCallback, useState } from 'react'
import type { SetStateAction } from 'react'
import type { FloorPlanState } from '../lib/constants'
import type { Floor, ProjectFloorPlan } from '../lib/floor-data'
import { addDocumentFloor, deleteDocumentFloor, getActiveFloorState, reorderDocumentFloors, switchDocumentFloor, updateActiveFloor } from '../lib/project-document'

/** One owner for all floors; fp is a view, not a second editable copy. */
export function useProjectDocument(initialPlan: ProjectFloorPlan) {
    const [document, setDocument] = useState(initialPlan)
    const setFp = useCallback((update: SetStateAction<FloorPlanState>) => {
        setDocument(plan => updateActiveFloor(plan, update))
    }, [])
    const switchFloor = useCallback((id: string) => setDocument(plan => switchDocumentFloor(plan, id)), [])
    const addFloor = useCallback((floor: Floor) => setDocument(plan => addDocumentFloor(plan, floor)), [])
    const deleteFloor = useCallback((id: string) => setDocument(plan => deleteDocumentFloor(plan, id)), [])
    const reorderFloors = useCallback((floors: Floor[]) => setDocument(plan => reorderDocumentFloors(plan, floors)), [])
    const renameFloor = useCallback((id: string, label: string) => setDocument(plan => ({
        ...plan, floors: plan.floors.map(floor => floor.id === id ? { ...floor, label } : floor),
    })), [])
    const toggleFloorVisible = useCallback((id: string) => setDocument(plan => ({
        ...plan, floors: plan.floors.map(floor => floor.id === id ? { ...floor, visible: !floor.visible } : floor),
    })), [])
    const setViewMode = useCallback((viewMode: ProjectFloorPlan['viewMode']) => setDocument(plan => ({ ...plan, viewMode })), [])
    const setRoof = useCallback((roof: ProjectFloorPlan['roof']) => setDocument(plan => ({ ...plan, roof })), [])
    const setShowUnderlay = useCallback((update: SetStateAction<boolean>) => setDocument(plan => ({
        ...plan, showUnderlay: typeof update === 'function' ? update(plan.showUnderlay) : update,
    })), [])

    return { document, replaceDocument: setDocument, fp: getActiveFloorState(document), setFp, switchFloor, addFloor,
        deleteFloor, reorderFloors, renameFloor, toggleFloorVisible, setViewMode, setRoof, setShowUnderlay }
}
