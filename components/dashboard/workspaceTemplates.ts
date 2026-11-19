import type { ProjectFloorPlan } from '../workspace/lib/floor-data'
import type { SceneConfig } from '../workspace/lib/scene-config'
import { createOfficeDemo } from './officeDemo'
import { finishModernOffice } from './officeFinish'
import { createFamilyHome, createStudioApartment } from './residentialTemplates'

export type WorkspaceTemplate = {
    id: string
    label: string
    description: string
    thumbnail: string
    create: () => { plan: ProjectFloorPlan; sceneConfig: SceneConfig }
}

export const WORKSPACE_TEMPLATES: WorkspaceTemplate[] = [
    {
        id: 'studio',
        label: 'Studio Apartment',
        description: 'An open living, sleeping and kitchen area with a separate bathroom.',
        thumbnail: '/preview-assets/studio-apartment.jpg',
        create: createStudioApartment,
    },
    {
        id: 'family_home',
        label: 'Family Home',
        description: 'Three bedrooms, a shared bathroom, a living room and an eat-in kitchen.',
        thumbnail: '/preview-assets/family-home.jpg',
        create: createFamilyHome,
    },
    {
        id: 'office',
        label: 'Office Space',
        description: 'Three furnished floors with reception, workstations and meeting rooms.',
        thumbnail: '/demo-office-reference.png',
        create: () => {
            const { plan, sceneConfig } = createOfficeDemo()
            return finishModernOffice(plan, sceneConfig)
        },
    },
]

// Keep previously shared draft URLs and their existing draft names working.
const OFFICE_DEMO_TEMPLATE: WorkspaceTemplate = {
    id: 'office-demo',
    label: 'Three-floor office',
    description: 'A furnished office example.',
    thumbnail: '/demo-office-reference.png',
    create: createOfficeDemo,
}

export function findWorkspaceTemplate(id: string | null) {
    return id === OFFICE_DEMO_TEMPLATE.id
        ? OFFICE_DEMO_TEMPLATE
        : WORKSPACE_TEMPLATES.find(template => template.id === id)
}
