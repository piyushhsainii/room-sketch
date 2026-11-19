jest.mock('next/navigation', () => ({ redirect: jest.fn((path: string) => { throw new Error("redirect:" + path) }) }))
jest.mock('@/lib/supabase/server', () => ({ createServerSupabaseClient: jest.fn() }))
jest.mock('@/lib/auth/chatgpt', () => ({ chatGPTConfig: jest.fn(), readSealed: jest.fn(), linkCookie: 'link' }))
jest.mock('@/components/dashboard/DashboardClient', () => ({ __esModule: true, default: jest.fn() }))
jest.mock('@/components/dashboard/DashboardAgent', () => ({ __esModule: true, default: jest.fn() }))
jest.mock('@/lib/supabase/middleware', () => ({ updateSession: jest.fn() }))

import DashboardPage from '@/app/dashboard/page'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { chatGPTConfig, readSealed } from '@/lib/auth/chatgpt'
import { updateSession } from '@/lib/supabase/middleware'
import { NextRequest, NextResponse } from 'next/server'
import { redirect } from 'next/navigation'

beforeEach(() => {
    jest.resetAllMocks()
    ;(redirect as unknown as jest.Mock).mockImplementation((path: string) => { throw new Error('redirect:' + path) })
})

test('guest dashboard entry redirects straight to the editor without reading account data', async () => {
    const from = jest.fn()
    ;(createServerSupabaseClient as jest.Mock).mockResolvedValue({
        auth: { getUser: async () => ({ data: { user: null } }) }, from,
    })
    ;(chatGPTConfig as jest.Mock).mockReturnValue({ clientId: 'client', key: 'key' })
    await expect(DashboardPage({ searchParams: Promise.resolve({}) })).rejects.toThrow("redirect:/projects/new")
    expect(from).not.toHaveBeenCalled()
    expect(readSealed).not.toHaveBeenCalled()
})

test('signed-in dashboard keeps the user and their plan', async () => {
    const query = { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(),
        single: async () => ({ data: { plan: 'pro' } }) }
    ;(createServerSupabaseClient as jest.Mock).mockResolvedValue({
        auth: { getUser: async () => ({ data: { user: { id: 'user', email: 'user@example.test' } } }) },
        from: () => query,
    })
    const page = await DashboardPage({ searchParams: Promise.resolve({}) })
    expect(page.props.children[0].props).toMatchObject({
        initialUser: { email: 'user@example.test' }, initialPlan: 'pro',
    })
})

import { proxy } from '@/proxy'
import { GET as authCallback } from '@/app/auth/callback/route'

test.each(['production', 'development'] as const)('guest routing in %s sends dashboard entry to editor and protects saved projects', async mode => {
    const originalEnv = process.env
    process.env = { ...originalEnv, NODE_ENV: mode }
    try {
        const pass = NextResponse.next()
        pass.cookies.set('session', 'refreshed')
        ;(updateSession as jest.Mock).mockResolvedValue({ supabaseResponse: pass, user: null })
        for (const [path, destination] of [
            ['/dashboard', '/projects/new'],
            ['/dashboard?template=office', '/projects/new?template=office'],
        ]) {
            const response = await proxy(new NextRequest('https://example.test' + path))
            expect(response.status).toBe(307)
            expect(response.headers.get('location')).toBe('https://example.test' + destination)
            expect(response.cookies.get('session')?.value).toBe('refreshed')
        }
        expect(await proxy(new NextRequest('https://example.test/projects/new?template=office'))).toBe(pass)
        const privateResponse = await proxy(new NextRequest('https://example.test/projects/saved'))
        expect(privateResponse.status).toBe(307)
        expect(privateResponse.headers.get('location')).toContain('/login?')
        expect(privateResponse.cookies.get('session')?.value).toBe('refreshed')
    } finally {
        process.env = originalEnv
    }
})

test('signed-in users reach dashboard and login preserves the requested draft save', async () => {
    const pass = NextResponse.next()
    ;(updateSession as jest.Mock).mockResolvedValue({ supabaseResponse: pass, user: { id: 'user' } })
    expect(await proxy(new NextRequest('https://example.test/dashboard'))).toBe(pass)
    const next = '/projects/new?template=office&save=1'
    const response = await proxy(new NextRequest('https://example.test/login?' + new URLSearchParams({ redirectTo: next })))
    expect(response.headers.get('location')).toBe('https://example.test' + next)
})

test('OAuth returns to the same draft and preserves its save intent', async () => {
    ;(createServerSupabaseClient as jest.Mock).mockResolvedValue({
        auth: { exchangeCodeForSession: jest.fn().mockResolvedValue({ error: null }) },
    })
    const next = '/projects/new?template=office&save=1'
    const response = await authCallback(new Request('https://example.test/auth/callback?' + new URLSearchParams({ code: 'code', next })))
    expect(response.status).toBe(303)
    expect(response.headers.get('location')).toBe('https://example.test' + next)
})

test.each(['/dashboard', '/projects/saved', '/login'])('auth redirects for %s are absolute and preserve the browser host', async path => {
    ;(updateSession as jest.Mock).mockResolvedValue({ supabaseResponse: NextResponse.next(), user: path === '/login' ? { id: 'user' } : null })
    // Next can normalize request.url to localhost even when the browser uses 127.0.0.1.
    const response = await proxy(new NextRequest('http://localhost:3000' + path, { headers: { host: '127.0.0.1:3000' } }))
    const location = new URL(response.headers.get('location')!)
    expect(location.origin).toBe('http://127.0.0.1:3000')
    expect(response.status).toBe(307)
})

test('a failed OAuth exchange provides a valid retry URL with the same draft', async () => {
    ;(createServerSupabaseClient as jest.Mock).mockResolvedValue({ auth: { exchangeCodeForSession: async () => ({ error: new Error('failed') }) } })
    const next = '/projects/new?template=office&save=1'
    const response = await authCallback(new Request('http://127.0.0.1:3000/auth/callback?' + new URLSearchParams({ code: 'code', next })))
    const location = new URL(response.headers.get('location')!)
    expect(location.origin).toBe('http://127.0.0.1:3000')
    expect(location.pathname).toBe('/login')
    expect(location.searchParams.get('redirectTo')).toBe(next)
    expect(location.searchParams.get('error')).toBe('auth')
})

test.each(['returned', 'thrown'])('a %s auth outage gives protected pages a retry screen and APIs a 503', async mode => {
    const session = updateSession as jest.Mock
    if (mode === 'thrown') session.mockRejectedValue(new Error('network unavailable'))
    else session.mockResolvedValue({ supabaseResponse: NextResponse.next(), user: null, unavailable: true })
    for (const path of ['/dashboard', '/projects/saved', '/login']) {
        const response = await proxy(new NextRequest('https://example.test' + path))
        expect(response.status).toBe(503)
        expect(response.headers.get('location')).toBeNull()
        expect(await response.text()).toContain('Unable to check your session')
    }
    const api = await proxy(new NextRequest('https://example.test/api/projects'))
    expect(api.status).toBe(503)
    expect(api.headers.get('content-type')).toContain('application/json')
    const draft = await proxy(new NextRequest('https://example.test/projects/new'))
    expect(draft.status).toBe(200)
    expect(draft.headers.get('x-middleware-next')).toBe('1')
})
