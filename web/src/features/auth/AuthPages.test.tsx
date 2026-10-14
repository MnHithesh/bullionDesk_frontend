import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { tokens } from '@/api/tokens'
import { renderApp } from '@/test/render'
import { server } from '@/test/server'

const user = {
  id: 'u1',
  email: 'trader@example.com',
  displayName: 'Asha',
  createdAt: '2026-10-14T09:30:00Z',
}

function mockMe() {
  server.use(
    http.get('/api/auth/me', ({ request }) =>
      request.headers.get('Authorization') === 'Bearer access-1'
        ? HttpResponse.json(user)
        : HttpResponse.json({ status: 401 }, { status: 401 }),
    ),
  )
}

describe('register page', () => {
  it('shows validation errors next to the fields without calling the API', async () => {
    const register = vi.fn()
    server.use(http.post('/api/auth/register', register))
    renderApp('/register')

    await userEvent.type(await screen.findByLabelText('Password'), 'gold')
    await userEvent.type(screen.getByLabelText('Confirm password'), 'silver')
    await userEvent.click(screen.getByRole('button', { name: 'Create account' }))

    expect(await screen.findByText('Enter your email')).toBeInTheDocument()
    expect(screen.getByText('Display name must be at least 2 characters')).toBeInTheDocument()
    expect(screen.getByText('Password needs: at least 8 characters')).toBeInTheDocument()
    expect(screen.getByText('Passwords do not match')).toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByLabelText('Email')).toHaveAccessibleDescription('Enter your email')
    expect(register).not.toHaveBeenCalled()
  })

  it('shows ValidationProblemDetails field errors from the server on the right field', async () => {
    server.use(
      http.post('/api/auth/register', () =>
        HttpResponse.json(
          {
            title: 'Validation failed',
            status: 400,
            errors: { Email: ['Email is already registered.'] },
          },
          { status: 400 },
        ),
      ),
    )
    renderApp('/register')

    await userEvent.type(await screen.findByLabelText('Display name'), 'Asha')
    await userEvent.type(screen.getByLabelText('Email'), 'trader@example.com')
    await userEvent.type(screen.getByLabelText('Password'), 'Gold#2026')
    await userEvent.type(screen.getByLabelText('Confirm password'), 'Gold#2026')
    await userEvent.click(screen.getByRole('button', { name: 'Create account' }))

    expect(await screen.findByText('Email is already registered.')).toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toHaveAccessibleDescription(
      'Email is already registered.',
    )
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('registers, signs in and lands on the markets page', async () => {
    mockMe()
    let registerBody: unknown
    server.use(
      http.post('/api/auth/register', async ({ request }) => {
        registerBody = await request.json()
        return HttpResponse.json(user, { status: 201 })
      }),
      http.post('/api/auth/login', () =>
        HttpResponse.json({ accessToken: 'access-1', refreshToken: 'refresh-1' }),
      ),
    )
    renderApp('/register')

    await userEvent.type(await screen.findByLabelText('Display name'), 'Asha')
    await userEvent.type(screen.getByLabelText('Email'), 'trader@example.com')
    await userEvent.type(screen.getByLabelText('Password'), 'Gold#2026')
    await userEvent.type(screen.getByLabelText('Confirm password'), 'Gold#2026')
    await userEvent.click(screen.getByRole('button', { name: 'Create account' }))

    expect(await screen.findByRole('heading', { name: 'Markets' })).toBeInTheDocument()
    expect(tokens.getRefreshToken()).toBe('refresh-1')
    expect(registerBody).toEqual({
      displayName: 'Asha',
      email: 'trader@example.com',
      password: 'Gold#2026',
    })
  })
})

describe('login page', () => {
  it('shows a non-field error from the server as an alert', async () => {
    server.use(
      http.post('/api/auth/login', () =>
        HttpResponse.json(
          { title: 'Unauthorized', status: 401, detail: 'Invalid email or password.' },
          { status: 401 },
        ),
      ),
    )
    renderApp('/login')

    await userEvent.type(await screen.findByLabelText('Email'), 'trader@example.com')
    await userEvent.type(screen.getByLabelText('Password'), 'wrong')
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid email or password.')
  })
})

describe('protected routes', () => {
  it('sends an anonymous visitor to the login page', async () => {
    const { router } = renderApp('/')

    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/login')
  })

  it('restores the session on load from the stored refresh token', async () => {
    mockMe()
    server.use(
      http.post('/api/auth/refresh', () =>
        HttpResponse.json({ accessToken: 'access-1', refreshToken: 'refresh-2' }),
      ),
    )
    localStorage.setItem('bulliondesk.refreshToken', 'refresh-1')
    renderApp('/')

    expect(await screen.findByRole('button', { name: 'Asha, account menu' })).toBeInTheDocument()
  })

  it('logs out back to the login page', async () => {
    mockMe()
    server.use(http.post('/api/auth/logout', () => new HttpResponse(null, { status: 204 })))
    tokens.set({ accessToken: 'access-1', refreshToken: 'refresh-1' })
    const { router } = renderApp('/')

    await userEvent.click(await screen.findByRole('button', { name: 'Asha, account menu' }))
    await userEvent.click(screen.getByRole('menuitem', { name: 'Log out' }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/login'))
    expect(tokens.hasSession()).toBe(false)
  })
})
