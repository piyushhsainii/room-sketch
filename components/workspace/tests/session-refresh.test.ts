jest.mock('@supabase/ssr', () => ({ createServerClient: jest.fn() }))

import { createServerClient } from '@supabase/ssr'
import { AuthRetryableFetchError, AuthSessionMissingError } from '@supabase/supabase-js'
import { NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

beforeEach(() => jest.resetAllMocks())

test('a missing session is a guest, not an auth outage', async () => {
    ;(createServerClient as jest.Mock).mockReturnValue({ auth: { getUser: async () => ({ data: { user: null }, error: new AuthSessionMissingError() }) } })
    const result = await updateSession(new NextRequest('https://example.test/dashboard'))
    expect(result.user).toBeNull()
    expect(result.unavailable).toBe(false)
})

test('transient auth errors cannot be mistaken for a signed-out or authenticated user', async () => {
    ;(createServerClient as jest.Mock).mockReturnValue({ auth: { getUser: async () => ({ data: { user: { id: 'stale' } }, error: new AuthRetryableFetchError('Unavailable', 503) }) } })
    const result = await updateSession(new NextRequest('https://example.test/dashboard'))
    expect(result.user).toBeNull()
    expect(result.unavailable).toBe(true)
})

test('session cookie removal survives a rejected refresh', async () => {
    ;(createServerClient as jest.Mock).mockImplementation((_url, _key, options) => ({ auth: { getUser: async () => {
        options.cookies.setAll([{ name: 'session', value: '', options: { maxAge: 0, path: '/' } }])
        return { data: { user: null }, error: new AuthSessionMissingError() }
    } } }))
    const result = await updateSession(new NextRequest('https://example.test/dashboard'))
    expect(result.supabaseResponse.cookies.get('session')?.maxAge).toBe(0)
    expect(result.unavailable).toBe(false)
})
