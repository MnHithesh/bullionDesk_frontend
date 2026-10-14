import { Navigate, type RouteObject } from 'react-router'
import { LoginPage } from '@/features/auth/LoginPage'
import { RegisterPage } from '@/features/auth/RegisterPage'
import { PublicOnly, RequireAuth } from '@/features/auth/RouteGuards'
import { MarketsPage } from '@/features/markets/MarketsPage'
import { OrdersPage } from '@/features/orders/OrdersPage'
import { PnlPage } from '@/features/portfolio/PnlPage'
import { PositionsPage } from '@/features/portfolio/PositionsPage'
import { TradesPage } from '@/features/portfolio/TradesPage'
import { RiskPage } from '@/features/risk/RiskPage'
import { WalletPage } from '@/features/wallet/WalletPage'
import { AppShell } from './AppShell'

export const routes: RouteObject[] = [
  {
    element: <PublicOnly />,
    children: [
      { path: '/login', element: <LoginPage /> },
      { path: '/register', element: <RegisterPage /> },
    ],
  },
  {
    element: <RequireAuth />,
    children: [
      {
        element: <AppShell />,
        children: [
          { path: '/', element: <Navigate to="/markets" replace /> },
          { path: '/markets', element: <MarketsPage /> },
          {
            path: '/markets/:symbol',
            // Loaded on first visit: the chart library is most of the bundle and only this page uses it.
            lazy: () =>
              import('@/features/markets/InstrumentDetailPage').then((m) => ({
                Component: m.InstrumentDetailPage,
              })),
          },
          { path: '/orders', element: <OrdersPage /> },
          { path: '/positions', element: <PositionsPage /> },
          { path: '/trades', element: <TradesPage /> },
          { path: '/pnl', element: <PnlPage /> },
          { path: '/wallet', element: <WalletPage /> },
          { path: '/risk', element: <RiskPage /> },
        ],
      },
    ],
  },
  // A proper 404 page comes with the polish step.
  { path: '*', element: <Navigate to="/" replace /> },
]
