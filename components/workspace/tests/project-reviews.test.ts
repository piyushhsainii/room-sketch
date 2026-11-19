jest.mock('@/lib/supabase/server', () => ({
    createServerSupabaseClient: jest.fn(),
    getSupabaseServerClient: jest.fn(),
}))
jest.mock('@/components/workspace/lib/getShareProject', () => ({ getShareProject: jest.fn() }))

import { GET, POST, PATCH } from '@/app/api/workspace/reviews/route'
import { createServerSupabaseClient, getSupabaseServerClient } from '@/lib/supabase/server'
import { getShareProject } from '../lib/getShareProject'

beforeEach(() => jest.resetAllMocks())
const userSession = createServerSupabaseClient as jest.Mock
const admin = getSupabaseServerClient as jest.Mock
const sharedProject = getShareProject as jest.Mock
const token = 'a'.repeat(32)

test('a revoked share cannot read review data', async () => {
    userSession.mockResolvedValue({ auth: { getUser: async () => ({ data: { user: null } }) } })
    sharedProject.mockResolvedValue(null)
    const response = await GET(new Request('https://example.test/api/workspace/reviews?token=' + token))
    expect(response.status).toBe(404)
    expect(admin).not.toHaveBeenCalled()
})

test('anonymous viewers cannot post to a valid share', async () => {
    userSession.mockResolvedValue({ auth: { getUser: async () => ({ data: { user: null } }) } })
    sharedProject.mockResolvedValue({ id: 'project' })
    const response = await POST(new Request('https://example.test/api/workspace/reviews', {
        method: 'POST', body: JSON.stringify({ token, body: 'Please move the door.' }),
    }))
    expect(response.status).toBe(401)
    expect(admin).not.toHaveBeenCalled()
})

test('reviewers cannot resolve owner comments using a share token', async () => {
    userSession.mockResolvedValue({ auth: { getUser: async () => ({ data: { user: { id: 'reviewer' } } }) } })
    const response = await PATCH(new Request('https://example.test/api/workspace/reviews', {
        method: 'PATCH', body: JSON.stringify({ token, id: '00000000-0000-4000-8000-000000000001', resolved: true }),
    }))
    expect(response.status).toBe(403)
    expect(admin).not.toHaveBeenCalled()
})

test('comments for missing floors are rejected before writing', async () => {
    userSession.mockResolvedValue({ auth: { getUser: async () => ({ data: { user: { id: 'reviewer' } } }) } })
    sharedProject.mockResolvedValue({ id: 'project', floorplan_editor_state: { projectFloorPlan: { floors: [{ id: 'ground' }] } } })
    const response = await POST(new Request('https://example.test/api/workspace/reviews', {
        method: 'POST', body: JSON.stringify({ token, floor_id: 'removed', body: 'Check this area.' }),
    }))
    expect(response.status).toBe(400)
    expect(admin).not.toHaveBeenCalled()
})

test('missing database migration produces a useful unavailable response', async () => {
    userSession.mockResolvedValue({ auth: { getUser: async () => ({ data: { user: null } }) } })
    sharedProject.mockResolvedValue({ id: 'project' })
    const query = { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(), limit: async () => ({ error: { code: 'PGRST205' } }) }
    admin.mockReturnValue({ from: () => query })
    const response = await GET(new Request('https://example.test/api/workspace/reviews?token=' + token))
    expect(response.status).toBe(503)
    expect((await response.json()).error).toMatch(/migration/)
})
