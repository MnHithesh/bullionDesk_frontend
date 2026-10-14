import { lazy } from 'react'

/**
 * Every page is its own chunk, loaded the first time its route renders (React.lazy). Pages use
 * named exports, so each import maps the module to the { default } shape lazy() expects.
 * <Suspense> in the layouts shows a placeholder while a chunk downloads.
 */
export const LoginPage = lazy(() =>
  import('@/features/auth/LoginPage').then((m) => ({ default: m.LoginPage })),
)
export const RegisterPage = lazy(() =>
  import('@/features/auth/RegisterPage').then((m) => ({ default: m.RegisterPage })),
)
export const MarketsPage = lazy(() =>
  import('@/features/markets/MarketsPage').then((m) => ({ default: m.MarketsPage })),
)
export const InstrumentDetailPage = lazy(() =>
  import('@/features/markets/InstrumentDetailPage').then((m) => ({
    default: m.InstrumentDetailPage,
  })),
)
export const OrdersPage = lazy(() =>
  import('@/features/orders/OrdersPage').then((m) => ({ default: m.OrdersPage })),
)
export const PositionsPage = lazy(() =>
  import('@/features/portfolio/PositionsPage').then((m) => ({ default: m.PositionsPage })),
)
export const TradesPage = lazy(() =>
  import('@/features/portfolio/TradesPage').then((m) => ({ default: m.TradesPage })),
)
export const PnlPage = lazy(() =>
  import('@/features/portfolio/PnlPage').then((m) => ({ default: m.PnlPage })),
)
export const WalletPage = lazy(() =>
  import('@/features/wallet/WalletPage').then((m) => ({ default: m.WalletPage })),
)
export const RiskPage = lazy(() =>
  import('@/features/risk/RiskPage').then((m) => ({ default: m.RiskPage })),
)
