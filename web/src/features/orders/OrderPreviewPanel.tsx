import { errorMessage, isApiError } from '@/api/errors'
import { Skeleton } from '@/components/Skeleton'
import { formatINR, formatNumber } from '@/lib/format'
import type { OrderPreview } from './api'

const chargeRows: [keyof OrderPreview['charges'], string][] = [
  ['brokerage', 'Brokerage'],
  ['exchangeFee', 'Exchange fee'],
  ['sebiFee', 'SEBI fee'],
  ['commodityTransactionTax', 'Commodity transaction tax'],
  ['stampDuty', 'Stamp duty'],
  ['gst', 'GST'],
]

/**
 * What the order would need, from POST /api/orders/preview. Every number is the backend's; the UI
 * only formats them. `stale` dims the panel while a newer preview loads.
 */
export function OrderPreviewPanel({
  preview,
  isLoading,
  stale,
  error,
  invalid,
}: {
  preview: OrderPreview | undefined
  isLoading: boolean
  stale: boolean
  error: unknown
  invalid: boolean
}) {
  if (invalid) {
    return (
      <p className="text-sm text-muted">Fix the highlighted fields to see margin and charges.</p>
    )
  }
  if (error && !(isApiError(error) && error.hasFieldErrors)) {
    return <p className="text-sm text-down">Preview unavailable: {errorMessage(error)}</p>
  }
  if (isLoading || !preview) {
    return (
      <div role="status" className="space-y-2">
        <span className="sr-only">Calculating margin and charges…</span>
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    )
  }

  return (
    <section
      aria-label="Order preview"
      aria-busy={stale || undefined}
      className={`space-y-3 text-sm transition-opacity ${stale ? 'opacity-60' : ''}`}
    >
      <dl className="space-y-1.5">
        <Row label="Required margin" value={formatINR(preview.requiredMargin)} strong />
        <Row label="Opening lots" value={formatNumber(preview.openingLots, 0)} />
        <Row label="Closing lots" value={formatNumber(preview.closingLots, 0)} />
        <Row label="Est. price" value={formatNumber(preview.referencePrice)} />
        <Row label="Turnover" value={formatINR(preview.turnover)} />
      </dl>
      {preview.closingLots > 0 && (
        <p className="text-xs text-muted">
          Closing lots reduce your current position ({formatNumber(preview.currentPosition, 0)}{' '}
          lots) and need no margin.
        </p>
      )}
      <details className="rounded-md border border-border px-3 py-2">
        <summary className="flex cursor-pointer justify-between gap-4">
          <span>Estimated charges</span>
          <span className="font-mono tabular-nums">{formatINR(preview.charges.total)}</span>
        </summary>
        <dl className="mt-2 space-y-1 text-muted">
          {chargeRows.map(([key, label]) => (
            <Row key={key} label={label} value={formatINR(preview.charges[key])} />
          ))}
        </dl>
      </details>
    </section>
  )
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className={strong ? 'font-medium' : 'text-muted'}>{label}</dt>
      <dd className={`font-mono tabular-nums ${strong ? 'font-semibold' : ''}`}>{value}</dd>
    </div>
  )
}
