import { screen, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { renderApp } from '@/test/render'
import { server } from '@/test/server'
import { signIn } from '@/test/session'

function marginWith(status: string, extra: Record<string, unknown> = {}) {
  return {
    cash: 1000000,
    blockedMargin: 392910,
    availableFunds: 607090,
    unrealisedPnl: -720000,
    equity: 280000,
    maintenanceRequired: 294689.25,
    squareOffLevel: 147344.63,
    shortfall: 14689.25,
    utilisationPercent: 140.3,
    status,
    positions: [],
    ...extra,
  }
}

function mockMargin(status: string) {
  server.use(http.get('/api/margin', () => HttpResponse.json(marginWith(status))))
}

beforeEach(() => signIn())

describe('margin banner', () => {
  it('stays hidden while the status is Normal', async () => {
    mockMargin('Normal')
    renderApp('/markets')

    await screen.findByRole('link', { name: 'Margin OK' })
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('shows a margin call on every page, linking to the Risk page', async () => {
    mockMargin('MarginCall')
    renderApp('/orders')

    const banner = await screen.findByRole('alert')
    expect(banner).toHaveTextContent('Margin call')
    expect(banner).toHaveTextContent('Equity is below the maintenance margin.')
    expect(within(banner).getByRole('link', { name: 'View risk' })).toHaveAttribute('href', '/risk')
  })

  it('shows square-off with the stronger style', async () => {
    mockMargin('SquareOff')
    renderApp('/markets')

    const banner = await screen.findByRole('alert')
    expect(banner).toHaveTextContent('Square-off')
    expect(banner).toHaveTextContent('Positions are being closed automatically.')
    expect(banner).toHaveClass('text-down')
  })

  it('drops the link when already on the Risk page', async () => {
    mockMargin('MarginCall')
    server.use(
      http.get('/api/margin/calls', () =>
        HttpResponse.json({ items: [], page: 1, pageSize: 20, totalCount: 0, totalPages: 0 }),
      ),
    )
    renderApp('/risk')

    const banner = await screen.findByRole('alert')
    expect(within(banner).queryByRole('link')).not.toBeInTheDocument()
    // The Risk page itself shows the status, shortfall and the gauge in the margin-call zone.
    expect(await screen.findByRole('meter')).toHaveAttribute('data-zone', 'marginCall')
    expect(screen.getByText('Shortfall').nextSibling).toHaveTextContent('₹14,689.25')
  })
})
