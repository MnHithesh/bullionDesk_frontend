import { delay, http, HttpResponse } from 'msw'
import { server } from '@/test/server'
import { identityApi, unwrap } from './client'
import { ApiError } from './errors'
import { tokens } from './tokens'

const user = {
  id: 'u1',
  email: 'trader@example.com',
  displayName: 'Asha',
  createdAt: '2026-10-14T09:30:00Z',
}

/** /me answers 200 only to the given token; /refresh counts calls and hands out that token. */
function mockSession({ validToken = 'fresh', refreshOk = true } = {}) {
  const calls = { refresh: 0, me: 0 }
  server.use(
    http.get('/api/auth/me', ({ request }) => {
      calls.me++
      return request.headers.get('Authorization') === `Bearer ${validToken}`
        ? HttpResponse.json(user)
        : HttpResponse.json({ title: 'Unauthorized', status: 401 }, { status: 401 })
    }),
    http.post('/api/auth/refresh', async () => {
      calls.refresh++
      await delay(20) // long enough for concurrent requests to pile up behind it
      return refreshOk
        ? HttpResponse.json({ accessToken: validToken, refreshToken: 'rotated' })
        : HttpResponse.json({ title: 'Invalid refresh token', status: 401 }, { status: 401 })
    }),
  )
  return calls
}

const getMe = () => unwrap(identityApi.GET('/api/auth/me'))

describe('authFetch', () => {
  it('sends the access token', async () => {
    const calls = mockSession({ validToken: 'valid' })
    tokens.set({ accessToken: 'valid', refreshToken: 'r1' })

    await expect(getMe()).resolves.toEqual(user)
    expect(calls.refresh).toBe(0)
  })

  it('shares one refresh between concurrent 401s, then retries both requests', async () => {
    const calls = mockSession()
    tokens.set({ accessToken: 'expired', refreshToken: 'r1' })

    const results = await Promise.all([getMe(), getMe(), getMe()])

    expect(results).toEqual([user, user, user])
    expect(calls.refresh).toBe(1)
    expect(calls.me).toBe(6) // three 401s, three retries
    expect(tokens.getAccessToken()).toBe('fresh')
    expect(tokens.getRefreshToken()).toBe('rotated')
  })

  it('gets an access token first when only the refresh token survived a reload', async () => {
    const calls = mockSession()
    localStorage.setItem('bulliondesk.refreshToken', 'r1')

    await expect(getMe()).resolves.toEqual(user)
    expect(calls.refresh).toBe(1)
    expect(calls.me).toBe(1)
  })

  it('ends the session when the refresh is rejected', async () => {
    const calls = mockSession({ refreshOk: false })
    tokens.set({ accessToken: 'expired', refreshToken: 'r1' })
    const listener = vi.fn()
    const unsubscribe = tokens.subscribe(listener)

    const error = await getMe().catch((e: unknown) => e)

    expect(error).toBeInstanceOf(ApiError)
    expect((error as ApiError).status).toBe(401)
    expect(calls.refresh).toBe(1)
    expect(tokens.hasSession()).toBe(false)
    expect(listener).toHaveBeenCalled()
    unsubscribe()
  })

  it.each([429, 503])('keeps the session when the refresh fails with %d', async (status) => {
    mockSession()
    server.use(
      http.post('/api/auth/refresh', () =>
        HttpResponse.json({ title: 'Too Many Requests', status }, { status }),
      ),
    )
    tokens.set({ accessToken: 'expired', refreshToken: 'r1' })

    const error = await getMe().catch((e: unknown) => e)

    expect(error).toMatchObject({ status })
    expect(tokens.getRefreshToken()).toBe('r1')
  })

  it('does not try to refresh when there is no session', async () => {
    const calls = mockSession()

    await expect(getMe()).rejects.toMatchObject({ status: 401 })
    expect(calls.refresh).toBe(0)
  })
})

describe('unwrap', () => {
  it('turns ValidationProblemDetails into an ApiError with field errors', async () => {
    server.use(
      http.post('/api/auth/register', () =>
        HttpResponse.json(
          {
            title: 'One or more validation errors occurred.',
            status: 400,
            errors: { Email: ['Email is already registered.'] },
            correlationId: 'abc-123',
          },
          { status: 400, headers: { 'Content-Type': 'application/problem+json' } },
        ),
      ),
    )

    const error = await unwrap(
      identityApi.POST('/api/auth/register', {
        body: { email: 'a@b.co', password: 'x', displayName: 'A' },
      }),
    ).catch((e: unknown) => e)

    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({
      status: 400,
      title: 'One or more validation errors occurred.',
      fieldErrors: { Email: ['Email is already registered.'] },
      correlationId: 'abc-123',
      hasFieldErrors: true,
    })
  })

  it('gives a usable error when the body is not ProblemDetails', async () => {
    server.use(http.get('/api/auth/me', () => new HttpResponse('Bad gateway', { status: 502 })))

    await expect(getMe()).rejects.toMatchObject({
      status: 502,
      title: 'The server had a problem. Please try again.',
    })
  })
})
