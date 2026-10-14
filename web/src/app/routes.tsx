import type { ComponentType } from 'react'
import { Navigate, type RouteObject } from 'react-router'
import { PublicOnly, RequireAuth } from '@/features/auth/RouteGuards'
import { AppShell } from './AppShell'
import { NotFoundPage } from './NotFoundPage'
import {
  InstrumentDetailPage,
  LoginPage,
  MarketsPage,
  OrdersPage,
  PnlPage,
  PositionsPage,
  RegisterPage,
  RiskPage,
  TradesPage,
  WalletPage,
} from './pages'
import { RouteError } from './RouteError'

/** A page route with its own error boundary, so one broken page can't take down the others. */
function page(path: string, Page: ComponentType): RouteObject {
  return { path, element: <Page />, errorElement: <RouteError /> }
}

export const routes: RouteObject[] = [
  {
    // Last-resort boundary for anything outside a page (guards, shell).
    errorElement: <RouteError />,
    children: [
      {
        element: <PublicOnly />,
        children: [page('/login', LoginPage), page('/register', RegisterPage)],
      },
      {
        element: <RequireAuth />,
        children: [
          {
            element: <AppShell />,
            children: [
              { path: '/', element: <Navigate to="/markets" replace /> },
              page('/markets', MarketsPage),
              page('/markets/:symbol', InstrumentDetailPage),
              page('/orders', OrdersPage),
              page('/positions', PositionsPage),
              page('/trades', TradesPage),
              page('/pnl', PnlPage),
              page('/wallet', WalletPage),
              page('/risk', RiskPage),
              { path: '*', element: <NotFoundPage /> },
            ],
          },
        ],
      },
    ],
  },
]
