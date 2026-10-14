import { http, HttpResponse } from 'msw'
import { expiries, instruments, quotes } from './fixtures'

/**
 * Default responses for the data every signed-in page loads (top bar + markets), so tests that
 * just navigate the app don't each have to mock them. A test overrides any of these with server.use().
 */
export const defaultHandlers = [
  http.get('/api/wallet', () =>
    HttpResponse.json({
      userId: 'u1',
      currency: 'INR',
      startingBalance: 1000000,
      balance: 1000000,
      blockedMargin: 0,
      availableFunds: 1000000,
      updatedAt: '2026-10-14T10:00:00+00:00',
    }),
  ),
  http.get('/api/margin', () =>
    HttpResponse.json({
      cash: 1000000,
      blockedMargin: 0,
      availableFunds: 1000000,
      unrealisedPnl: 0,
      equity: 1000000,
      maintenanceRequired: 0,
      squareOffLevel: 0,
      shortfall: 0,
      utilisationPercent: 0,
      status: 'Normal',
      positions: [],
    }),
  ),
  http.get('/api/instruments', () => HttpResponse.json(instruments)),
  http.get('/api/expiries', () => HttpResponse.json(expiries)),
  http.get('/api/quotes', () => HttpResponse.json(quotes)),
  http.get('/api/orders', () =>
    HttpResponse.json({ items: [], page: 1, pageSize: 20, totalCount: 0, totalPages: 0 }),
  ),
]
