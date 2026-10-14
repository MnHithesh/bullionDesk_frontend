import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { renderApp } from '@/test/render'
import { server } from '@/test/server'
import { signIn } from '@/test/session'

const ledger = {
  items: [
    {
      id: 'l-2',
      type: 'Charges',
      amount: -517.81,
      referenceId: 't-1',
      description: 'Charges on SILVER26DECFUT',
      createdAt: '2026-10-14T17:36:01+00:00',
    },
    {
      id: 'l-1',
      type: 'RealisedPnl',
      amount: 5730,
      referenceId: 't-1',
      description: 'Realised P&L on SILVER26DECFUT',
      createdAt: '2026-10-14T17:36:01+00:00',
    },
  ],
  page: 1,
  pageSize: 20,
  totalCount: 2,
  totalPages: 1,
}

beforeEach(() => {
  signIn()
  server.use(http.get('/api/wallet/ledger', () => HttpResponse.json(ledger)))
})

describe('wallet page', () => {
  it('lists ledger entries with their type and a signed amount', async () => {
    renderApp('/wallet')

    const charges = (await screen.findByText('Charges on SILVER26DECFUT')).closest('li')!
    expect(charges).toHaveTextContent('Charges')
    expect(within(charges).getByText('-₹517.81')).toHaveClass('text-down')
    const pnl = screen.getByText('Realised P&L on SILVER26DECFUT').closest('li')!
    expect(within(pnl).getByText('+₹5,730.00')).toHaveClass('text-up')
  })

  it('explains a reset refused because margin is blocked (422)', async () => {
    server.use(
      http.post('/api/wallet/reset', () =>
        HttpResponse.json(
          {
            title: 'Business rule violated',
            status: 422,
            detail: 'Close all positions and cancel open orders before resetting the wallet.',
          },
          { status: 422 },
        ),
      ),
    )
    renderApp('/wallet')

    await userEvent.click(await screen.findByRole('button', { name: 'Reset wallet' }))
    const dialog = screen.getByRole('dialog', { name: 'Reset wallet?' })
    await userEvent.click(within(dialog).getByRole('button', { name: 'Reset wallet' }))

    const alert = await within(dialog).findByRole('alert')
    expect(alert).toHaveTextContent('Reset refused: margin is still blocked')
    expect(alert).toHaveTextContent('Close all positions and cancel open orders')
    expect(within(alert).getByRole('link', { name: 'Open orders' })).toHaveAttribute(
      'href',
      '/orders?status=Open',
    )
  })
})
