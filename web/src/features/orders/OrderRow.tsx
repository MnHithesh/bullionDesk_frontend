import { useQueryClient } from '@tanstack/react-query'
import { toast } from '@/components/toast/toastStore'
import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { errorMessage } from '@/api/errors'
import { Alert } from '@/components/Alert'
import { Button } from '@/components/Button'
import { Dialog } from '@/components/Dialog'
import { formatDateTimeIST, formatINR, formatNumber } from '@/lib/format'
import {
  invalidateAfterOrderChange,
  isFinal,
  isInsufficientFunds,
  useCancelOrder,
  useOrder,
  type Order,
} from './api'
import { ModifyOrderDialog } from './ModifyOrderDialog'
import { OrderStatusBadge } from './OrderStatusBadge'

const cell = 'px-3 py-2.5'

/**
 * One order in the order book, with its own cancel and modify flows. Cancel is server-confirmed:
 * DELETE returns 202 (accepted, not done), so the row polls GET /api/orders/{id} and shows
 * "Cancelling…" until the order reaches a final status, which may be Filled if it traded first.
 */
export function OrderRow({ order, tickSize }: { order: Order; tickSize: number | null }) {
  const queryClient = useQueryClient()
  const [confirmingCancel, setConfirmingCancel] = useState(false)
  const [modifying, setModifying] = useState(false)
  const [cancelRequested, setCancelRequested] = useState(false)
  const cancel = useCancelOrder()
  const tracked = useOrder(cancelRequested ? order.id : null)

  const live = tracked.data?.order ?? order
  const settled = isFinal(live.status)
  const cancelling = cancelRequested && !settled

  useEffect(() => {
    if (!cancelRequested || !settled) return
    void invalidateAfterOrderChange(queryClient)
    if (live.status === 'Cancelled') toast.success('Order cancelled', `${live.symbol}`)
    else toast.info(`Order ${live.status.toLowerCase()} before the cancel arrived`, live.symbol)
    // Runs once, when the requested cancel settles.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cancelRequested, settled, queryClient])

  const canCancel = !settled && !cancelRequested
  const canModify =
    live.status === 'Open' && live.type === 'Limit' && !cancelRequested && tickSize !== null

  async function confirmCancel() {
    try {
      await cancel.mutateAsync(order.id)
      setCancelRequested(true)
      setConfirmingCancel(false)
    } catch {
      // The error is shown in the dialog from cancel.error.
    }
  }

  return (
    <tr className="border-t border-border align-top">
      <td className={`${cell} font-mono text-xs whitespace-nowrap text-muted tabular-nums`}>
        {formatDateTimeIST(live.createdAt)}
      </td>
      <th scope="row" className={`${cell} text-left font-medium`}>
        <Link to={`/markets/${encodeURIComponent(live.symbol)}`} className="hover:underline">
          {live.symbol}
        </Link>
        {live.origin !== 'User' && (
          <span className="block text-xs text-muted">Auto square-off</span>
        )}
      </th>
      <td className={`${cell} ${live.side === 'Buy' ? 'text-up' : 'text-down'}`}>{live.side}</td>
      <td className={`${cell} text-right font-mono tabular-nums`}>{live.lots}</td>
      <td className={`${cell} text-right font-mono whitespace-nowrap tabular-nums`}>
        {live.type === 'Limit' ? formatNumber(live.limitPrice) : 'Market'}
      </td>
      <td className={cell}>
        <span aria-live="polite">
          <OrderStatusBadge status={live.status} label={cancelling ? 'Cancelling…' : undefined} />
        </span>
        {isInsufficientFunds(live) ? (
          <span className="mt-1 block text-xs font-medium text-down">
            Insufficient funds: needed {formatINR(live.requiredMargin)} margin
          </span>
        ) : (
          live.statusReason && (
            <span className="mt-1 block max-w-56 text-xs text-muted">{live.statusReason}</span>
          )
        )}
      </td>
      <td className={`${cell} text-right whitespace-nowrap`}>
        <div className="inline-flex gap-2">
          {canModify && (
            <Button
              variant="secondary"
              className="px-2.5 py-1"
              aria-label={`Modify order ${live.symbol}`}
              onClick={() => setModifying(true)}
            >
              Modify
            </Button>
          )}
          {canCancel && (
            <Button
              variant="secondary"
              className="px-2.5 py-1"
              aria-label={`Cancel order ${live.symbol}`}
              onClick={() => setConfirmingCancel(true)}
            >
              Cancel
            </Button>
          )}
        </div>

        <Dialog
          open={confirmingCancel}
          onClose={() => {
            setConfirmingCancel(false)
            cancel.reset()
          }}
          title="Cancel this order?"
        >
          <p className="text-left text-sm whitespace-normal">
            {live.side} {live.lots} {live.lots === 1 ? 'lot' : 'lots'} {live.symbol}
            {live.type === 'Limit' ? ` at ${formatNumber(live.limitPrice)}` : ' at market'}. Any
            margin blocked for it is released once it is cancelled.
          </p>
          {cancel.isError && (
            <div className="mt-3 text-left">
              <Alert title="Could not cancel">{errorMessage(cancel.error)}</Alert>
            </div>
          )}
          <div className="mt-4 flex justify-end gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                setConfirmingCancel(false)
                cancel.reset()
              }}
              disabled={cancel.isPending}
            >
              Keep order
            </Button>
            <Button variant="sell" loading={cancel.isPending} onClick={() => void confirmCancel()}>
              Cancel order
            </Button>
          </div>
        </Dialog>

        {tickSize !== null && (
          <ModifyOrderDialog
            order={live}
            tickSize={tickSize}
            open={modifying}
            onClose={() => setModifying(false)}
          />
        )}
      </td>
    </tr>
  )
}
