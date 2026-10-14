import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { toInstrument } from '@/features/markets/api'
import { instrumentJson, orderDetailJson, orderJson, previewJson } from '@/test/fixtures'
import { renderWithProviders } from '@/test/render'
import { server } from '@/test/server'
import { signIn } from '@/test/session'
import { OrderTicket } from './OrderTicket'

const gold = toInstrument(instrumentJson('GOLD26DECFUT', 'GOLD', '2026-12-05'))

function renderTicket() {
  signIn()
  return renderWithProviders(<OrderTicket instrument={gold} lastPrice={136195} />)
}

/** Records every preview request body and answers with the fixture. */
function mockPreview() {
  const bodies: unknown[] = []
  server.use(
    http.post('/api/orders/preview', async ({ request }) => {
      bodies.push(await request.json())
      return HttpResponse.json(previewJson)
    }),
  )
  return bodies
}

const lotsInput = () => screen.getByRole('spinbutton', { name: 'Lots' })

describe('order ticket: validation', () => {
  it('flags missing or fractional lots and does not ask for a preview', async () => {
    const bodies = mockPreview()
    renderTicket()
    await screen.findByLabelText('Order preview')
    bodies.length = 0

    await userEvent.clear(lotsInput())
    expect(await screen.findByText('Enter the number of lots')).toBeInTheDocument()
    expect(lotsInput()).toHaveAttribute('aria-invalid', 'true')

    await userEvent.type(lotsInput(), '1.5')
    expect(await screen.findByText('Lots must be a whole number')).toBeInTheDocument()
    expect(screen.getByText(/Fix the highlighted fields/)).toBeInTheDocument()
    await new Promise((r) => setTimeout(r, 400))
    expect(bodies).toEqual([])
  })

  it('checks the limit price against the tick size from the spec', async () => {
    mockPreview()
    renderTicket()

    await userEvent.click(screen.getByRole('radio', { name: 'Limit' }))
    const price = screen.getByRole('spinbutton', { name: 'Limit price' })
    expect(price).toHaveValue(136195) // starts at the last price

    await userEvent.clear(price)
    await userEvent.type(price, '136195.5')
    expect(
      await screen.findByText('Price must be a multiple of the tick size (1)'),
    ).toBeInTheDocument()

    await userEvent.clear(price)
    expect(await screen.findByText('Enter a limit price')).toBeInTheDocument()
  })

  it('shows a server-side limit (such as maximum lots) on the lots field', async () => {
    server.use(
      http.post('/api/orders/preview', () =>
        HttpResponse.json(
          { status: 400, errors: { lots: ["'Lots' must be between 1 and 100. You entered 500."] } },
          { status: 400 },
        ),
      ),
    )
    renderTicket()

    await userEvent.clear(lotsInput())
    await userEvent.type(lotsInput(), '500')

    expect(
      await screen.findByText("'Lots' must be between 1 and 100. You entered 500."),
    ).toBeInTheDocument()
  })
})

describe('order ticket: preview', () => {
  it('shows margin, opening/closing lots, turnover and the charges breakdown', async () => {
    mockPreview()
    renderTicket()

    const preview = await screen.findByLabelText('Order preview')
    expect(within(preview).getByText('Required margin').nextSibling).toHaveTextContent(
      '₹21,78,272.00',
    )
    expect(within(preview).getByText('Opening lots').nextSibling).toHaveTextContent('2')
    expect(within(preview).getByText('Closing lots').nextSibling).toHaveTextContent('0')
    expect(within(preview).getByText('Turnover').nextSibling).toHaveTextContent('₹2,72,28,400.00')

    await userEvent.click(within(preview).getByText('Estimated charges'))
    expect(within(preview).getByText('Exchange fee').nextSibling).toHaveTextContent('₹571.80')
    expect(within(preview).getByText('Stamp duty').nextSibling).toHaveTextContent('₹544.57')
    expect(within(preview).getByText('Estimated charges').nextSibling).toHaveTextContent(
      '₹1,275.03',
    )
  })

  it('debounces: rapid changes send one preview for the final values', async () => {
    const bodies = mockPreview()
    renderTicket()
    await screen.findByLabelText('Order preview')
    expect(bodies).toEqual([
      { symbol: 'GOLD26DECFUT', side: 'Buy', lots: 1, type: 'Market', limitPrice: null },
    ])

    const more = screen.getByRole('button', { name: 'One lot more' })
    await userEvent.click(more)
    await userEvent.click(more)
    await userEvent.click(screen.getByRole('radio', { name: 'Sell' }))

    await waitFor(() => expect(bodies).toHaveLength(2))
    expect(bodies[1]).toEqual({
      symbol: 'GOLD26DECFUT',
      side: 'Sell',
      lots: 3,
      type: 'Market',
      limitPrice: null,
    })
  })
})

describe('order ticket: placing', () => {
  it('confirms, places, and follows the order to an insufficient-funds rejection', async () => {
    mockPreview()
    let placed: unknown
    const pending = orderJson({
      id: 'o-9',
      symbol: 'GOLD26DECFUT',
      type: 'Market',
      limitPrice: null,
      status: 'Pending',
      requiredMargin: 1089080,
    })
    let polls = 0
    server.use(
      http.post('/api/orders', async ({ request }) => {
        placed = await request.json()
        return HttpResponse.json(orderDetailJson(pending), { status: 201 })
      }),
      http.get('/api/orders/o-9', () => {
        polls++
        const rejected = {
          ...pending,
          status: 'Rejected',
          statusReason: 'Margin not available: Insufficient funds',
        }
        return HttpResponse.json(
          orderDetailJson(polls < 2 ? pending : rejected, [
            { status: 'Pending', note: 'Placed', at: '2026-10-14T10:00:00+00:00' },
            ...(polls < 2
              ? []
              : [
                  {
                    status: 'Rejected',
                    note: 'Margin not available: Insufficient funds',
                    at: '2026-10-14T10:00:01+00:00',
                  },
                ]),
          ]),
        )
      }),
    )
    renderTicket()
    await screen.findByLabelText('Order preview')

    await userEvent.click(screen.getByRole('button', { name: 'Review buy order' }))
    expect(screen.getByRole('heading', { name: 'Confirm order' })).toBeInTheDocument()
    expect(placed).toBeUndefined() // nothing is sent before confirming

    await userEvent.click(screen.getByRole('button', { name: 'Place buy order' }))

    expect(await screen.findByText('Rejected: insufficient funds')).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent(
      'This order needs ₹10,89,080.00 margin but only ₹10,00,000.00 is available',
    )
    expect(placed).toEqual({
      symbol: 'GOLD26DECFUT',
      side: 'Buy',
      lots: 1,
      type: 'Market',
      limitPrice: null,
    })
    const timeline = screen.getByRole('list', { name: 'Status history' })
    expect(within(timeline).getAllByRole('listitem')).toHaveLength(2)
  })
})

describe('order ticket: shortcuts', () => {
  it('b and s pick the side and move to the lots field, but not while typing', async () => {
    mockPreview()
    renderTicket()
    await screen.findByLabelText('Order preview')

    await userEvent.keyboard('s')
    expect(screen.getByRole('radio', { name: 'Sell' })).toHaveAttribute('aria-checked', 'true')
    expect(lotsInput()).toHaveFocus()

    // Typing in a field is just typing.
    await userEvent.keyboard('b')
    expect(screen.getByRole('radio', { name: 'Sell' })).toHaveAttribute('aria-checked', 'true')

    lotsInput().blur()
    await userEvent.keyboard('b')
    expect(screen.getByRole('radio', { name: 'Buy' })).toHaveAttribute('aria-checked', 'true')
  })
})
