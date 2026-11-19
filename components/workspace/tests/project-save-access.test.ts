jest.mock('server-only', () => ({}), { virtual: true })
jest.mock('@/lib/supabase/server', () => ({ createServerSupabaseClient: jest.fn() }))
jest.mock('@/lib/workspace/floorPlanConvertor', () => ({ projectFloorPlanToSceneJSON: jest.fn(() => ({ scene: 'converted' })) }))
jest.mock('@/lib/workspace/sceneConfigToWorkspaceConfig', () => ({ sceneConfigToWorkspaceConfig: jest.fn(() => ({ config: 'converted' })) }))

import { POST } from '@/app/api/projects/route'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextRequest } from 'next/server'

const state = { projectFloorPlan: { floors: [{ id: 'ground' }], activeFloorId: 'ground' }, sceneConfig: { rooms: [] } }
const request = () => new NextRequest('https://example.test/api/projects', {
    method: 'POST', body: JSON.stringify({ name: 'Guest design', state }),
})

beforeEach(() => jest.clearAllMocks())

test('guest save requires authentication before any account query or insert', async () => {
    const from = jest.fn()
    ;(createServerSupabaseClient as jest.Mock).mockResolvedValue({
        auth: { getUser: async () => ({ data: { user: null } }) }, from,
    })
    expect((await POST(request())).status).toBe(401)
    expect(from).not.toHaveBeenCalled()
})

test.each([
    ['free', 0, 201], ['free', 1, 402], ['pro', 1, 201], ['pro', 5, 402],
])('saving the same draft on %s with %i existing projects returns %i', async (plan, count, status) => {
    const insert = jest.fn((payload: Record<string, unknown>) => ({
        select: () => ({ single: async () => ({ data: { id: 'saved', ...payload } }) }),
    }))
    const projectQuery = { select: () => ({ eq: async () => ({ count }) }), insert }
    ;(createServerSupabaseClient as jest.Mock).mockResolvedValue({
        auth: { getUser: async () => ({ data: { user: { id: 'user' } } }) },
        from: (table: string) => table === 'subscriptions'
            ? { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { plan_id: plan, status: 'active' } }) }) }) }
            : projectQuery,
    })
    const response = await POST(request())
    expect(response.status).toBe(status)
    if (status === 402) {
        expect(await response.json()).toMatchObject({ error: 'plan_limit', plan })
        expect(insert).not.toHaveBeenCalled()
    } else {
        expect(insert).toHaveBeenCalledWith(expect.objectContaining({
            name: 'Guest design',
            floorplan_editor_state: expect.objectContaining(state),
        }))
    }
})
