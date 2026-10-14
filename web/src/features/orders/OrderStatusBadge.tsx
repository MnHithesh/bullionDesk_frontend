import type { OrderStatus } from './api'

const styles: Record<OrderStatus, string> = {
  Pending: 'border-border text-muted',
  Open: 'border-accent/50 bg-accent/10 text-text',
  Filled: 'border-up/40 bg-up/10 text-up',
  Rejected: 'border-down/40 bg-down/10 text-down',
  Cancelled: 'border-border bg-bg text-muted',
}

/** Order status as text in a tinted pill; the word carries the meaning, colour supports it. */
export function OrderStatusBadge({ status, label }: { status: OrderStatus; label?: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap ${styles[status]}`}
    >
      {label ?? status}
    </span>
  )
}
