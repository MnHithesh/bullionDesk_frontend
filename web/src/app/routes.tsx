import { Navigate, type RouteObject } from 'react-router'
import { LoginPage } from '@/features/auth/LoginPage'
import { RegisterPage } from '@/features/auth/RegisterPage'
import { PublicOnly, RequireAuth } from '@/features/auth/RouteGuards'
import { MarketsPage } from '@/features/markets/MarketsPage'
import { AppShell } from './AppShell'
import { ComingSoonPage } from './ComingSoonPage'

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
          { path: '/orders', element: <ComingSoonPage title="Orders" /> },
          { path: '/positions', element: <ComingSoonPage title="Positions" /> },
          { path: '/wallet', element: <ComingSoonPage title="Wallet" /> },
          { path: '/risk', element: <ComingSoonPage title="Risk" /> },
        ],
      },
    ],
  },
  // A proper 404 page comes with the polish step.
  { path: '*', element: <Navigate to="/" replace /> },
]
