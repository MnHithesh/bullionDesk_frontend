import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { orderDetailJson, orderJson, pnlJson, positionJson } from '@/test/fixtures'
import { renderApp } from '@/test/render'
import { server } from '@/test/server'
import { signIn } from '@/test/session'

const silver = positionJson()
const goldShort = positionJson({
  id: 'p-2',
  symbol: 'GOLD26NOVFUT',
  underlying: 'GOLD',
  direction: 'Short',
  netLots: 2,
  averagePrice: 135400,
  lastPrice: 135300,
  unrealisedPnl: 20000,
  requiredMargin: 2164800,
})

/** Positions that disappear once square-off has been requested for them. */
function mockPositions(initial: unknown[]) {
  let current = initial as { symbol: string }[]
  const squareOffBodies: unknown[] = []
  server.use(
    http.get('/api/positions', () => HttpResponse.json(current)),
    http.get('/api/pnl', () => HttpResponse.json(pnlJson)),
    http.post('/api/orders/square-off', async ({ request }) => {
      const body = (await request.json()) as { symbol: string | null }
      squareOffBodies.push(body)
      const closing = current.filter((p) => body.symbol === null || p.symbol === body.symbol)
      // The backend answers with the market orders it placed; the positions go a moment later.
      setTimeout(() => {
        current = current.filter((p) => !closing.includes(p))
      }, 300)
      return HttpResponse.json(
        closing.map((p) =>
          orderDetailJson(orderJson({ symbol: p.symbol, type: 'Market', status: 'Pending' })),
        ),
      )
    }),
  )
  return squareOffBodies
}

beforeEach(() => signIn())

describe('positions page', () => {
  it('lists positions with direction, prices, P&L and margin, and the total unrealised', async () => {
    mockPositions([silver, goldShort])
    renderApp('/positions')

    const row = (await screen.findByRole('rowheader', { name: 'SILVER26DECFUT' })).closest('tr')!
    expect(row).toHaveTextContent('▲ Long')
    expect(row).toHaveTextContent('1,30,594.00')
    expect(within(row).getByText(/330/)).toHaveTextContent('▼ loss -₹330.00')
    expect(row).toHaveTextContent('₹3,91,782.00')
    const gold = screen.getByRole('rowheader', { name: 'GOLD26NOVFUT' }).closest('tr')!
    expect(gold).toHaveTextContent('▼ Short')
    expect(await screen.findByText(/1,250.50/)).toHaveTextContent('+₹1,250.50')
  })

  it('closes one position after confirmation and shows Closing… until it is gone', async () => {
    const bodies = mockPositions([silver, goldShort])
    renderApp('/positions')

    await userEvent.click(
      await screen.findByRole('button', { name: 'Close position SILVER26DECFUT' }),
    )
    const dialog = screen.getByRole('dialog', { name: 'Close SILVER26DECFUT?' })
    expect(dialog).toHaveTextContent('Places a market order to sell 1 lot at the current price.')
    expect(bodies).toEqual([]) // nothing sent before confirming

    await userEvent.click(within(dialog).getByRole('button', { name: 'Close position' }))

    expect(bodies).toEqual([{ symbol: 'SILVER26DECFUT' }])
    expect(
      await screen.findByRole('button', { name: 'Close position SILVER26DECFUT' }),
    ).toHaveTextContent('Closing…')
    await waitFor(
      () =>
        expect(screen.queryByRole('rowheader', { name: 'SILVER26DECFUT' })).not.toBeInTheDocument(),
      { timeout: 5000 },
    )
    expect(screen.getByRole('rowheader', { name: 'GOLD26NOVFUT' })).toBeInTheDocument()
  })

  it('closes all positions with one request', async () => {
    const bodies = mockPositions([silver, goldShort])
    renderApp('/positions')

    await userEvent.click(await screen.findByRole('button', { name: 'Close all' }))
    const dialog = screen.getByRole('dialog', { name: 'Close all positions?' })
    expect(dialog).toHaveTextContent('close all 2 open positions')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Close all' }))

    expect(bodies).toEqual([{ symbol: null }])
    expect(await screen.findByText('No open positions', {}, { timeout: 5000 })).toBeInTheDocument()
  })

  it('keeps the dialog open with the reason when the close fails', async () => {
    mockPositions([silver])
    server.use(
      http.post('/api/orders/square-off', () =>
        HttpResponse.json(
          { title: 'Not found', status: 404, detail: 'No open position in SILVER26DECFUT.' },
          { status: 404 },
        ),
      ),
    )
    renderApp('/positions')

    await userEvent.click(
      await screen.findByRole('button', { name: 'Close position SILVER26DECFUT' }),
    )
    await userEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Close position' }),
    )

    expect(await within(screen.getByRole('dialog')).findByRole('alert')).toHaveTextContent(
      'No open position in SILVER26DECFUT.',
    )
  })
})
