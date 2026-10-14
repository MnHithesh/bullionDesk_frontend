import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { renderApp } from '@/test/render'
import { server } from '@/test/server'
import { signIn } from '@/test/session'
import { RouteError } from './RouteError'

beforeEach(() => signIn())

describe('toasts', () => {
  it('shows a server fault from a mutation with its correlation id', async () => {
    server.use(
      http.get('/api/positions', () =>
        HttpResponse.json([
          {
            id: 'p-1',
            symbol: 'SILVER26NOVFUT',
            underlying: 'SILVER',
            direction: 'Long',
            netLots: 1,
            averagePrice: 130000,
            lastPrice: 130100,
            unrealisedPnl: 3000,
            realisedPnl: 0,
            requiredMargin: 390000,
            multiplier: 30,
            updatedAt: '2026-10-14T10:00:00Z',
          },
        ]),
      ),
      http.get('/api/pnl', () =>
        HttpResponse.json({
          realised: 0,
          charges: 0,
          netRealised: 0,
          unrealised: 3000,
          total: 3000,
          trades: 0,
        }),
      ),
      http.post('/api/orders/square-off', () =>
        HttpResponse.json(
          { title: 'Internal Server Error', status: 500, correlationId: 'corr-7f3a' },
          { status: 500 },
        ),
      ),
    )
    renderApp('/positions')

    await userEvent.click(
      await screen.findByRole('button', { name: 'Close position SILVER26NOVFUT' }),
    )
    await userEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Close position' }),
    )

    const notifications = screen.getByRole('region', { name: 'Notifications' })
    const toast = await within(notifications).findByRole('alert')
    expect(toast).toHaveTextContent('Request failed')
    expect(toast).toHaveTextContent('Reference corr-7f3a')
  })

  it('shows one toast, not one per poll, when a refresh keeps failing', async () => {
    let fail = false
    server.use(
      http.get('/api/quotes', () =>
        fail
          ? HttpResponse.json(
              { title: 'Bad gateway', status: 502, correlationId: 'corr-q' },
              { status: 502 },
            )
          : HttpResponse.json([]),
      ),
    )
    renderApp('/markets')
    await screen.findByRole('heading', { name: 'Markets' })
    await waitFor(() => expect(screen.getAllByRole('row').length).toBeGreaterThan(1))
    fail = true

    const notifications = screen.getByRole('region', { name: 'Notifications' })
    expect(await within(notifications).findByText('Could not refresh data')).toBeInTheDocument()
    await new Promise((r) => setTimeout(r, 2500)) // two more failing polls
    expect(within(notifications).getAllByRole('alert')).toHaveLength(1)
  })

  it('does not toast 4xx answers, which are shown where they happen', async () => {
    server.use(
      http.get('/api/orders', () =>
        HttpResponse.json({
          items: [
            {
              id: 'o-1',
              symbol: 'SILVER26NOVFUT',
              underlying: 'SILVER',
              side: 'Buy',
              type: 'Limit',
              lots: 1,
              limitPrice: 120000,
              referencePrice: 120000,
              marginLots: 1,
              requiredMargin: 360000,
              status: 'Open',
              statusReason: null,
              origin: 'User',
              createdAt: '2026-10-14T10:00:00Z',
              updatedAt: '2026-10-14T10:00:00Z',
            },
          ],
          page: 1,
          pageSize: 20,
          totalCount: 1,
          totalPages: 1,
        }),
      ),
      http.delete('/api/orders/o-1', () =>
        HttpResponse.json(
          { title: 'Conflict', status: 409, detail: 'The order is already Filled.' },
          { status: 409 },
        ),
      ),
    )
    renderApp('/orders')

    await userEvent.click(
      await screen.findByRole('button', { name: 'Cancel order SILVER26NOVFUT' }),
    )
    await userEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancel order' }),
    )

    expect(await within(screen.getByRole('dialog')).findByRole('alert')).toHaveTextContent(
      'already Filled',
    )
    expect(
      within(screen.getByRole('region', { name: 'Notifications' })).queryByRole('alert'),
    ).toBeNull()
  })
})

describe('routing polish', () => {
  it('shows a 404 page inside the app for unknown addresses', async () => {
    renderApp('/no-such-page')

    expect(await screen.findByRole('heading', { name: 'Page not found' })).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'Main' })).toBeInTheDocument()
    await waitFor(() => expect(document.title).toBe('Page not found · BullionDesk'))
  })

  it('sets the document title per page', async () => {
    renderApp('/orders')
    await screen.findByRole('heading', { name: 'Orders' })
    await waitFor(() => expect(document.title).toBe('Orders · BullionDesk'))
  })

  it('catches a crashing page in its route error boundary', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    function Broken(): never {
      throw new Error('Kaboom')
    }
    const router = createMemoryRouter([
      { path: '/', element: <Broken />, errorElement: <RouteError /> },
    ])
    render(<RouterProvider router={router} />)

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('This page hit a problem')
    expect(alert).toHaveTextContent('Kaboom')
    expect(within(alert).getByRole('button', { name: 'Reload page' })).toBeInTheDocument()
    consoleError.mockRestore()
  })
})

describe('keyboard shortcuts', () => {
  it('"/" focuses the contract search, which opens a contract with the keyboard', async () => {
    const { router } = renderApp('/orders')
    await screen.findByRole('heading', { name: 'Orders' })

    await userEvent.keyboard('/')
    const search = screen.getByRole('combobox', { name: 'Search contracts' })
    expect(search).toHaveFocus()

    await userEvent.type(search, 'silver')
    const list = await screen.findByRole('listbox', { name: 'Contracts' })
    expect(within(list).getByRole('option', { name: /SILVER26NOVFUT/ })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    await userEvent.keyboard('{Enter}')
    expect(router.state.location.pathname).toBe('/markets/SILVER26NOVFUT')
  })
})
