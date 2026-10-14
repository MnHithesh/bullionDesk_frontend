import { screen, waitFor, within } from '@testing-library/react'
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

beforeEach(() => {
  server.use(http.get('/api/auth/me', () => HttpResponse.json(user)))
  tokens.set({ accessToken: 'access-1', refreshToken: 'refresh-1' })
})

describe('markets page', () => {
  it('groups contracts by underlying with their live quotes', async () => {
    renderApp('/markets')

    const gold = await screen.findByRole('rowheader', { name: 'GOLD' })
    const goldGroup = gold.closest('tbody')!
    expect(
      within(goldGroup)
        .getAllByRole('link')
        .map((a) => a.textContent),
    ).toEqual(['GOLD26NOVFUT', 'GOLD26DECFUT'])
    const silverRow = screen.getByRole('link', { name: 'SILVER26NOVFUT' }).closest('tr')!
    // Quotes arrive from their own request, possibly after the contracts.
    await waitFor(() => expect(silverRow).toHaveTextContent('1,30,410.00'))
    expect(silverRow).toHaveTextContent('-0.13%')
  })

  it('filters by expiry tab and keeps the choice in the URL', async () => {
    const { router } = renderApp('/markets')

    await userEvent.click(await screen.findByRole('tab', { name: '05 Dec 2026' }))

    expect(screen.getByRole('tab', { name: '05 Dec 2026' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    expect(screen.getByRole('link', { name: 'GOLD26DECFUT' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'GOLD26NOVFUT' })).not.toBeInTheDocument()
    expect(screen.queryByRole('rowheader', { name: 'SILVER' })).not.toBeInTheDocument()
    expect(router.state.location.search).toBe('?expiry=2026-12-05')
  })

  it('shows an empty state when nothing is listed', async () => {
    server.use(
      http.get('/api/instruments', () => HttpResponse.json([])),
      http.get('/api/expiries', () => HttpResponse.json([])),
    )
    renderApp('/markets')

    expect(await screen.findByText('No contracts to show')).toBeInTheDocument()
  })

  it('shows the error with a retry when contracts fail to load', async () => {
    server.use(
      http.get('/api/instruments', () =>
        HttpResponse.json({ title: 'Service unavailable', status: 503 }, { status: 503 }),
      ),
    )
    renderApp('/markets')

    expect(await screen.findByRole('alert')).toHaveTextContent('Could not load contracts')
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument()
  })

  it('shows available funds and margin status in the top bar', async () => {
    renderApp('/markets')

    const topBar = await screen.findByRole('banner')
    expect(await within(topBar).findByText('₹10,00,000.00')).toBeInTheDocument()
    expect(within(topBar).getByRole('link', { name: 'Margin OK' })).toHaveAttribute('href', '/risk')
  })
})
