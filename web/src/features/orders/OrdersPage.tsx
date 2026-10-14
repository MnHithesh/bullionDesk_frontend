import { useSearchParams } from 'react-router'
import { Button } from '@/components/Button'
import { EmptyState, ErrorState } from '@/components/QueryStates'
import { Skeleton } from '@/components/Skeleton'
import { useInstruments } from '@/features/markets/api'
import { istDayStartUtc, istNextDayStartUtc } from '@/lib/istDays'
import { orderStatuses, useOrders, type OrderFilters, type OrderStatus } from './api'
import { OrderRow } from './OrderRow'

const PAGE_SIZE = 20

/** Order book from GET /api/orders. Filters and the page live in the URL, like Angular query params. */
export function OrdersPage() {
  const [params, setParams] = useSearchParams()
  const status = (params.get('status') as OrderStatus | null) ?? undefined
  const symbol = params.get('symbol') ?? undefined
  const from = params.get('from') ?? ''
  const to = params.get('to') ?? ''
  const page = Math.max(1, Number(params.get('page')) || 1)
  const datesInvalid = from !== '' && to !== '' && to < from

  const filters: OrderFilters = {
    status,
    symbol,
    from: from ? istDayStartUtc(from) : undefined,
    to: to ? istNextDayStartUtc(to) : undefined,
    page,
    pageSize: PAGE_SIZE,
  }
  const orders = useOrders(filters)
  const instruments = useInstruments()
  const tickBySymbol = new Map((instruments.data ?? []).map((i) => [i.symbol, i.tickSize]))

  /** Changing a filter goes back to page 1. */
  function setFilter(name: string, value: string) {
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (value) next.set(name, value)
        else next.delete(name)
        if (name !== 'page') next.delete('page')
        return next
      },
      { replace: true },
    )
  }

  const hasFilters = Boolean(status || symbol || from || to)
  const data = orders.data

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">Orders</h1>

      <form
        aria-label="Filter orders"
        onSubmit={(e) => e.preventDefault()}
        className="grid grid-cols-2 gap-3 rounded-lg border border-border bg-surface p-3 sm:grid-cols-4 lg:flex lg:items-end"
      >
        <Select
          label="Status"
          value={status ?? ''}
          onChange={(v) => setFilter('status', v)}
          options={orderStatuses.map((s) => ({ value: s, label: s }))}
          allLabel="All statuses"
        />
        <Select
          label="Contract"
          value={symbol ?? ''}
          onChange={(v) => setFilter('symbol', v)}
          options={(instruments.data ?? []).map((i) => ({ value: i.symbol, label: i.symbol }))}
          allLabel="All contracts"
        />
        <DateField label="From" value={from} onChange={(v) => setFilter('from', v)} />
        <DateField label="To" value={to} onChange={(v) => setFilter('to', v)} />
        {hasFilters && (
          <Button
            variant="secondary"
            className="col-span-2 sm:col-span-4 lg:col-span-1"
            onClick={() => setParams({}, { replace: true })}
          >
            Clear filters
          </Button>
        )}
      </form>

      {datesInvalid ? (
        <EmptyState title="Check the dates">The “To” date is before the “From” date.</EmptyState>
      ) : orders.isPending ? (
        <div role="status" className="space-y-3 rounded-lg border border-border bg-surface p-4">
          <span className="sr-only">Loading orders…</span>
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className="h-5 w-full" />
          ))}
        </div>
      ) : orders.isError ? (
        <ErrorState
          title="Could not load orders"
          error={orders.error}
          onRetry={() => void orders.refetch()}
        />
      ) : data!.items.length === 0 ? (
        <EmptyState title={hasFilters ? 'No orders match these filters' : 'No orders yet'}>
          {hasFilters
            ? 'Try a different status, contract or date.'
            : 'Place one from a contract on the Markets page.'}
        </EmptyState>
      ) : (
        <>
          <div
            className={`overflow-x-auto rounded-lg border border-border bg-surface transition-opacity ${orders.isPlaceholderData ? 'opacity-60' : ''}`}
            aria-busy={orders.isPlaceholderData || undefined}
          >
            <table className="w-full text-sm">
              <thead className="text-xs text-muted">
                <tr>
                  <th scope="col" className="px-3 py-2 text-left font-medium">
                    Placed (IST)
                  </th>
                  <th scope="col" className="px-3 py-2 text-left font-medium">
                    Contract
                  </th>
                  <th scope="col" className="px-3 py-2 text-left font-medium">
                    Side
                  </th>
                  <th scope="col" className="px-3 py-2 text-right font-medium">
                    Lots
                  </th>
                  <th scope="col" className="px-3 py-2 text-right font-medium">
                    Price
                  </th>
                  <th scope="col" className="px-3 py-2 text-left font-medium">
                    Status
                  </th>
                  <th scope="col" className="px-3 py-2 text-right font-medium">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {data!.items.map((order) => (
                  <OrderRow
                    key={order.id}
                    order={order}
                    tickSize={tickBySymbol.get(order.symbol) ?? null}
                  />
                ))}
              </tbody>
            </table>
          </div>
          <nav aria-label="Pagination" className="flex items-center justify-between gap-3 text-sm">
            <span className="text-muted">
              Page {data!.page} of {Math.max(1, data!.totalPages)} · {data!.totalCount}{' '}
              {data!.totalCount === 1 ? 'order' : 'orders'}
            </span>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                disabled={page <= 1}
                onClick={() => setFilter('page', String(page - 1))}
              >
                Previous
              </Button>
              <Button
                variant="secondary"
                disabled={page >= data!.totalPages}
                onClick={() => setFilter('page', String(page + 1))}
              >
                Next
              </Button>
            </div>
          </nav>
        </>
      )}
    </div>
  )
}

function Select({
  label,
  value,
  onChange,
  options,
  allLabel,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string }[]
  allLabel: string
}) {
  return (
    <label className="block text-sm">
      <span className="font-medium">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 block w-full rounded-md border border-border bg-surface px-2 py-2 text-text"
      >
        <option value="">{allLabel}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  )
}

function DateField({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <label className="block text-sm">
      <span className="font-medium">{label}</span>
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 block w-full rounded-md border border-border bg-surface px-2 py-1.5 text-text"
      />
    </label>
  )
}
