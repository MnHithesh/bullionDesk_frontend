import { screen, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { pnlJson } from '@/test/fixtures'
import { renderApp } from '@/test/render'
import { server } from '@/test/server'
import { signIn } from '@/test/session'

describe('P&L page', () => {
  it('asks for the last 30 IST days and draws one bar per trading day', async () => {
    signIn()
    let query: URLSearchParams | undefined
    server.use(
      http.get('/api/pnl', () => HttpResponse.json(pnlJson)),
      http.get('/api/pnl/daily', ({ request }) => {
        query = new URL(request.url).searchParams
        return HttpResponse.json([
          { date: query.get('To'), realised: -60, charges: 900.81, net: -960.81, trades: 2 },
        ])
      }),
    )
    renderApp('/pnl')

    const bars = await screen.findByRole('list', { name: 'Daily net P&L' })
    // Plain IST dates, as the backend's DateOnly parameters expect.
    expect(query?.get('From')).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(query?.get('To')).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(within(bars).getAllByRole('listitem')).toHaveLength(30)
    expect(within(bars).getByRole('button', { name: /net -₹960.81, 2 trades/ })).toBeInTheDocument()
  })
})
