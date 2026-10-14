import { formatTimeIST } from '@/lib/format'
import type { OrderStatusChange } from './api'
import { OrderStatusBadge } from './OrderStatusBadge'

/** The order's status history, oldest first, as a vertical timeline. */
export function OrderTimeline({ history }: { history: OrderStatusChange[] }) {
  return (
    <ol aria-label="Status history" className="relative space-y-3 border-l border-border pl-4">
      {history.map((change, index) => (
        // History entries have no id; the timestamp plus position is unique and stable (append-only).
        <li key={`${change.at}-${index}`} className="relative">
          <span
            aria-hidden="true"
            className="absolute top-1.5 -left-[21px] size-2.5 rounded-full border-2 border-surface bg-accent"
          />
          <div className="flex flex-wrap items-center gap-2">
            <OrderStatusBadge status={change.status} />
            <time dateTime={change.at} className="font-mono text-xs text-muted tabular-nums">
              {formatTimeIST(change.at)} IST
            </time>
          </div>
          {change.note && <p className="mt-0.5 text-sm text-muted">{change.note}</p>}
        </li>
      ))}
    </ol>
  )
}
