import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { Link } from 'react-router'
import { Alert } from '@/components/Alert'
import { Button } from '@/components/Button'
import { ErrorState } from '@/components/QueryStates'
import { Spinner } from '@/components/Spinner'
import { useWallet } from '@/features/wallet/api'
import { formatINR, formatNumber } from '@/lib/format'
import {
  invalidateAfterOrderChange,
  isFinal,
  isInsufficientFunds,
  useOrder,
  type Order,
} from './api'
import { OrderStatusBadge } from './OrderStatusBadge'
import { OrderTimeline } from './OrderTimeline'

/** Live status of a placed order: polls GET /api/orders/{id} until it is final. */
export function OrderTracker({ orderId, onNewOrder }: { orderId: string; onNewOrder: () => void }) {
  const queryClient = useQueryClient()
  const detail = useOrder(orderId)
  const status = detail.data?.order.status
  const final = status !== undefined && isFinal(status)

  // Once the outcome is known, funds, margin and order lists are out of date.
  useEffect(() => {
    if (final) void invalidateAfterOrderChange(queryClient)
  }, [final, queryClient])

  if (detail.isPending) return <Spinner />
  if (detail.isError) {
    return (
      <ErrorState
        title="Could not load the order"
        error={detail.error}
        onRetry={() => void detail.refetch()}
      />
    )
  }

  const { order, history, fills } = detail.data
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium">
          {order.side} {order.lots} {order.lots === 1 ? 'lot' : 'lots'} {order.symbol}
        </p>
        <span aria-live="polite" className="inline-flex items-center gap-2">
          {!final && <Spinner className="size-4 text-muted" />}
          <OrderStatusBadge status={order.status} />
        </span>
      </div>

      {isInsufficientFunds(order) ? (
        <InsufficientFunds order={order} />
      ) : (
        order.status === 'Rejected' && (
          <Alert title="Order rejected">{order.statusReason ?? 'No reason was given.'}</Alert>
        )
      )}

      {fills.length > 0 && (
        <ul className="text-sm">
          {fills.map((fill) => (
            <li key={fill.id}>
              Filled {fill.lots} {fill.lots === 1 ? 'lot' : 'lots'} at{' '}
              <span className="font-mono tabular-nums">{formatNumber(fill.price)}</span>
            </li>
          ))}
        </ul>
      )}

      <OrderTimeline history={history} />

      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" onClick={onNewOrder}>
          New order
        </Button>
        <Link
          to="/orders"
          className="inline-flex items-center px-2 text-sm text-accent underline-offset-4 hover:underline"
        >
          Order book
        </Link>
      </div>
    </div>
  )
}

function InsufficientFunds({ order }: { order: Order }) {
  const wallet = useWallet()
  return (
    <Alert title="Rejected: insufficient funds">
      This order needs {formatINR(order.requiredMargin)} margin
      {wallet.data && <> but only {formatINR(wallet.data.availableFunds)} is available</>}. Reduce
      the lots, or close positions to free up margin.
    </Alert>
  )
}
