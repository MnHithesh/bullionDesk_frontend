import { useState } from 'react'
import { PageTitle } from '@/components/PageTitle'
import { useSearchParams } from 'react-router'
import { Button } from '@/components/Button'
import { DateField, SelectField } from '@/components/FilterFields'
import { Pagination } from '@/components/Pagination'
import { EmptyState, ErrorState, LoadingState } from '@/components/QueryStates'
import { useInstruments } from '@/features/markets/api'
import { formatDateTimeIST, formatINR, formatNumber } from '@/lib/format'
import { istDayStartUtc, istNextDayStartUtc } from '@/lib/istDays'
import { useTrades, type Trade } from './api'
import { ContractNote } from './ContractNote'
import { PnlAmount } from './PnlAmount'

const PAGE_SIZE = 20

/** Trade history from GET /api/trades; a trade opens its contract note. */
export function TradesPage() {
  const [params, setParams] = useSearchParams()
  const symbol = params.get('symbol') ?? ''
  const from = params.get('from') ?? ''
  const to = params.get('to') ?? ''
  const page = Math.max(1, Number(params.get('page')) || 1)
  const datesInvalid = from !== '' && to !== '' && to < from
  const [noteFor, setNoteFor] = useState<Trade | null>(null)

  const trades = useTrades({
    symbol: symbol || undefined,
    from: from ? istDayStartUtc(from) : undefined,
    to: to ? istNextDayStartUtc(to) : undefined,
    page,
    pageSize: PAGE_SIZE,
  })
  const instruments = useInstruments()

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

  const hasFilters = Boolean(symbol || from || to)
  const data = trades.data

  return (
    <div className="space-y-4">
      <PageTitle title="Trades" />
      <h1 className="text-2xl font-semibold tracking-tight">Trades</h1>

      <form
        aria-label="Filter trades"
        onSubmit={(e) => e.preventDefault()}
        className="grid grid-cols-2 gap-3 rounded-lg border border-border bg-surface p-3 sm:grid-cols-3 lg:flex lg:items-end"
      >
        <SelectField
          label="Contract"
          value={symbol}
          onChange={(v) => setFilter('symbol', v)}
          options={(instruments.data ?? []).map((i) => ({ value: i.symbol, label: i.symbol }))}
          allLabel="All contracts"
        />
        <DateField label="From" value={from} onChange={(v) => setFilter('from', v)} />
        <DateField label="To" value={to} onChange={(v) => setFilter('to', v)} />
        {hasFilters && (
          <Button
            variant="secondary"
            className="col-span-2 sm:col-span-3 lg:col-span-1"
            onClick={() => setParams({}, { replace: true })}
          >
            Clear filters
          </Button>
        )}
      </form>

      {datesInvalid ? (
        <EmptyState title="Check the dates">The “To” date is before the “From” date.</EmptyState>
      ) : trades.isPending ? (
        <LoadingState label="Loading trades" count={5} />
      ) : trades.isError ? (
        <ErrorState
          title="Could not load trades"
          error={trades.error}
          onRetry={() => void trades.refetch()}
        />
      ) : data!.items.length === 0 ? (
        <EmptyState title={hasFilters ? 'No trades match these filters' : 'No trades yet'}>
          {hasFilters
            ? 'Try a different contract or date.'
            : 'Trades appear here when orders fill.'}
        </EmptyState>
      ) : (
        <>
          <div
            className={`relative overflow-x-auto rounded-lg border border-border bg-surface transition-opacity ${trades.isPlaceholderData ? 'opacity-60' : ''}`}
          >
            <table className="w-full min-w-[42rem] text-sm">
              <thead className="text-xs text-muted">
                <tr>
                  <th scope="col" className="px-3 py-2 text-left font-medium">
                    Executed (IST)
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
                  <th scope="col" className="px-3 py-2 text-right font-medium">
                    Realised P&amp;L
                  </th>
                  <th scope="col" className="px-3 py-2 text-right font-medium">
                    Charges
                  </th>
                </tr>
              </thead>
              <tbody>
                {data!.items.map((trade) => (
                  <tr
                    key={trade.id}
                    onClick={() => setNoteFor(trade)}
                    className="cursor-pointer border-t border-border hover:bg-bg"
                  >
                    <td className="px-3 py-2.5 font-mono text-xs whitespace-nowrap text-muted">
                      {formatDateTimeIST(trade.executedAt)}
                    </td>
                    <th scope="row" className="px-3 py-2.5 text-left font-medium">
                      {trade.symbol}
                      {trade.kind !== 'Fill' && (
                        <span className="block text-xs text-muted">{trade.kind}</span>
                      )}
                    </th>
                    <td className={`px-3 py-2.5 ${trade.side === 'Buy' ? 'text-up' : 'text-down'}`}>
                      {trade.side}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono tabular-nums">{trade.lots}</td>
                    <td className="px-3 py-2.5 text-right font-mono tabular-nums">
                      {formatNumber(trade.price)}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <PnlAmount value={trade.realisedPnl} />
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <button
                        type="button"
                        className="font-mono text-accent tabular-nums underline-offset-4 hover:underline"
                        aria-label={`Charges ${formatINR(trade.charges)}: view contract note for ${trade.side} ${trade.lots} ${trade.symbol}`}
                        onClick={(e) => {
                          e.stopPropagation()
                          setNoteFor(trade)
                        }}
                      >
                        {formatINR(trade.charges)}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination
            page={data!.page}
            totalPages={data!.totalPages}
            totalCount={data!.totalCount}
            noun={['trade', 'trades']}
            onPage={(p) => setFilter('page', String(p))}
          />
        </>
      )}

      <ContractNote trade={noteFor} onClose={() => setNoteFor(null)} />
    </div>
  )
}
