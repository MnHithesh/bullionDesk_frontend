import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { orderDetailJson, orderJson } from '@/test/fixtures'
import { renderApp } from '@/test/render'
import { server } from '@/test/server'
import { signIn } from '@/test/session'

const open = orderJson({ id: 'o-1', status: 'Open' })
const filledOrder = orderJson({
  id: 'o-2',
  type: 'Market',
  limitPrice: null,
  status: 'Filled',
  createdAt: '2026-10-14T09:00:00+00:00',
})
const rejected = orderJson({
  id: 'o-3',
  symbol: 'GOLD26DECFUT',
  type: 'Market',
  limitPrice: null,
  requiredMargin: 1089080,
  status: 'Rejected',
  statusReason: 'Margin not available: Insufficient funds',
})

function page(items: unknown[], extra = {}) {
  return { items, page: 1, pageSize: 20, totalCount: items.length, totalPages: 1, ...extra }
}

beforeEach(() => signIn())

describe('orders page', () => {
  it('lists orders with status, actions only where allowed, and a clear insufficient-funds reason', async () => {
    server.use(
      http.get('/api/orders', () => HttpResponse.json(page([open, filledOrder, rejected]))),
    )
    renderApp('/orders')

    const rows = await screen.findAllByRole('row')
    const [, openRow, filledRow, rejectedRow] = rows
    expect(within(openRow).getByText('Open')).toBeInTheDocument()
    expect(within(openRow).getByRole('button', { name: /Modify/ })).toBeInTheDocument()
    expect(within(openRow).getByRole('button', { name: /Cancel/ })).toBeInTheDocument()
    expect(within(filledRow).queryByRole('button')).not.toBeInTheDocument()
    expect(rejectedRow).toHaveTextContent('Insufficient funds: needed ₹10,89,080.00 margin')
  })

  it('sends filters and the page to the API and keeps them in the URL', async () => {
    const requests: URLSearchParams[] = []
    server.use(
      http.get('/api/orders', ({ request }) => {
        requests.push(new URL(request.url).searchParams)
        return HttpResponse.json(page([open], { totalCount: 45, totalPages: 3 }))
      }),
    )
    const { router } = renderApp('/orders')
    await screen.findByText('Page 1 of 3 · 45 orders')

    await userEvent.selectOptions(screen.getByLabelText('Status'), 'Open')
    await waitFor(() => expect(requests.at(-1)?.get('Status')).toBe('Open'))

    await userEvent.click(screen.getByRole('button', { name: 'Next' }))
    await waitFor(() => expect(requests.at(-1)?.get('Page')).toBe('2'))
    expect(router.state.location.search).toBe('?status=Open&page=2')

    // An IST day becomes a UTC range: from its start to the next day's start.
    await userEvent.type(screen.getByLabelText('From'), '2026-10-14')
    await waitFor(() => expect(requests.at(-1)?.get('From')).toBe('2026-10-13T18:30:00.000Z'))
    expect(requests.at(-1)?.get('Page')).toBe('1') // a new filter goes back to page 1
  })

  it('shows an empty state when there are no orders', async () => {
    server.use(http.get('/api/orders', () => HttpResponse.json(page([]))))
    renderApp('/orders')

    expect(await screen.findByText('No orders yet')).toBeInTheDocument()
  })

  it('cancels: confirm, DELETE 202, then polls the order until it is Cancelled', async () => {
    let cancelled = false
    let deletes = 0
    let polls = 0
    server.use(
      http.get('/api/orders', () =>
        HttpResponse.json(
          page([
            cancelled ? { ...open, status: 'Cancelled', statusReason: 'Cancelled by user' } : open,
          ]),
        ),
      ),
      http.delete('/api/orders/o-1', () => {
        deletes++
        // 202: accepted, still Open until Execution processes it.
        return HttpResponse.json(orderDetailJson(open), { status: 202 })
      }),
      http.get('/api/orders/o-1', () => {
        polls++
        if (polls >= 2) cancelled = true
        const order = cancelled
          ? { ...open, status: 'Cancelled', statusReason: 'Cancelled by user' }
          : open
        return HttpResponse.json(orderDetailJson(order))
      }),
    )
    renderApp('/orders')

    await userEvent.click(
      await screen.findByRole('button', { name: /Cancel order SILVER26NOVFUT/ }),
    )
    const dialog = screen.getByRole('dialog', { name: 'Cancel this order?' })
    expect(dialog).toHaveTextContent('Buy 1 lot SILVER26NOVFUT at 1,20,000.00')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Cancel order' }))

    expect(await screen.findByText('Cancelling…')).toBeInTheDocument()
    expect(deletes).toBe(1)
    const row = screen.getAllByRole('row')[1]
    expect(
      await within(row).findByText('Cancelled by user', {}, { timeout: 5000 }),
    ).toBeInTheDocument()
    expect(within(row).getByText('Cancelled')).toBeInTheDocument()
    expect(within(row).queryByRole('button', { name: /Cancel order/ })).not.toBeInTheDocument()
    expect(polls).toBeGreaterThanOrEqual(2)
  })

  it('shows a conflict when the order already finished before the cancel arrived', async () => {
    server.use(
      http.get('/api/orders', () => HttpResponse.json(page([open]))),
      http.delete('/api/orders/o-1', () =>
        HttpResponse.json(
          { title: 'Conflict', status: 409, detail: 'The order is already Filled.' },
          { status: 409 },
        ),
      ),
    )
    renderApp('/orders')

    await userEvent.click(
      await screen.findByRole('button', { name: /Cancel order SILVER26NOVFUT/ }),
    )
    await userEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancel order' }),
    )

    expect(await screen.findByRole('alert')).toHaveTextContent('The order is already Filled.')
  })

  it('explains a modify that needs more margin (422)', async () => {
    server.use(
      http.get('/api/orders', () => HttpResponse.json(page([open]))),
      http.put('/api/orders/o-1', () =>
        HttpResponse.json(
          {
            title: 'Business rule violated',
            status: 422,
            detail:
              'This change needs 1,800,000.00 margin but only 360,000.00 is blocked. Cancel and place a new order instead.',
          },
          { status: 422 },
        ),
      ),
    )
    renderApp('/orders')

    await userEvent.click(
      await screen.findByRole('button', { name: /Modify order SILVER26NOVFUT/ }),
    )
    const dialog = screen.getByRole('dialog')
    const lots = within(dialog).getByLabelText('Lots')
    await userEvent.clear(lots)
    await userEvent.type(lots, '5')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save changes' }))

    const alert = await within(dialog).findByRole('alert')
    expect(alert).toHaveTextContent('Needs more margin')
    expect(alert).toHaveTextContent('only 360,000.00 is blocked')
    expect(alert).toHaveTextContent('cancel this order and place a new one')
  })
})
