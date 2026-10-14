import { useSearchParams } from 'react-router'
import { PageTitle } from '@/components/PageTitle'
import { EmptyState, ErrorState } from '@/components/QueryStates'
import { Skeleton } from '@/components/Skeleton'
import { Alert } from '@/components/Alert'
import { errorMessage } from '@/api/errors'
import { useExpiries, useInstruments, useQuotes, type Instrument, type Quote } from './api'
import { ALL_EXPIRIES, ExpiryTabs } from './ExpiryTabs'
import { QuoteRow } from './QuoteRow'

const TABLE_ID = 'market-watch'

export function MarketsPage() {
  const instruments = useInstruments()
  const expiries = useExpiries()
  const quotes = useQuotes()
  const [params, setParams] = useSearchParams()
  const selected = params.get('expiry') ?? ALL_EXPIRIES

  const expiryDates = [...new Set((expiries.data ?? []).map((e) => e.expiryDate))].sort()
  const visible = (instruments.data ?? []).filter(
    (i) => selected === ALL_EXPIRIES || i.expiryDate === selected,
  )
  const quoteBySymbol = new Map((quotes.data ?? []).map((q) => [q.symbol, q]))

  function selectExpiry(expiry: string) {
    setParams(expiry === ALL_EXPIRIES ? {} : { expiry }, { replace: true })
  }

  return (
    <div className="space-y-4">
      <PageTitle title="Markets" />
      <h1 className="text-2xl font-semibold tracking-tight">Markets</h1>

      {expiryDates.length > 0 && (
        <ExpiryTabs
          expiries={expiryDates}
          selected={selected}
          onSelect={selectExpiry}
          controls={TABLE_ID}
        />
      )}

      {quotes.isError && instruments.isSuccess && (
        <Alert title="Live prices unavailable">
          {errorMessage(quotes.error)} Showing the last prices received; retrying every second.
        </Alert>
      )}

      <div
        id={TABLE_ID}
        role={expiryDates.length > 0 ? 'tabpanel' : undefined}
        aria-label="Contracts"
      >
        {instruments.isPending ? (
          <MarketTableSkeleton />
        ) : instruments.isError ? (
          <ErrorState
            title="Could not load contracts"
            error={instruments.error}
            onRetry={() => void instruments.refetch()}
          />
        ) : visible.length === 0 ? (
          <EmptyState title="No contracts to show">
            {selected === ALL_EXPIRIES
              ? 'No gold or silver contracts are listed right now.'
              : 'Nothing expires on this date. Pick another expiry.'}
          </EmptyState>
        ) : (
          <MarketTable instruments={visible} quotes={quoteBySymbol} />
        )}
      </div>
    </div>
  )
}

function groupByUnderlying(instruments: Instrument[]) {
  const groups = new Map<string, Instrument[]>()
  for (const instrument of instruments) {
    const list = groups.get(instrument.underlying) ?? []
    list.push(instrument)
    groups.set(instrument.underlying, list)
  }
  for (const list of groups.values()) list.sort((a, b) => a.expiry.localeCompare(b.expiry))
  return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b))
}

function MarketTable({
  instruments,
  quotes,
}: {
  instruments: Instrument[]
  quotes: Map<string, Quote>
}) {
  return (
    <div className="relative overflow-x-auto rounded-lg border border-border bg-surface">
      <table className="w-full text-xs sm:text-sm">
        <TableHead />
        {groupByUnderlying(instruments).map(([underlying, list]) => (
          // One <tbody> per underlying: a row group with its own header, so screen readers
          // announce "GOLD" for the rows below it.
          <tbody key={underlying}>
            <tr className="border-t border-border bg-bg/60">
              <th
                scope="rowgroup"
                colSpan={6}
                className="px-3 py-1.5 text-left text-xs font-semibold tracking-wide text-muted uppercase"
              >
                {underlying}
              </th>
            </tr>
            {list.map((instrument) => (
              <QuoteRow
                key={instrument.symbol}
                instrument={instrument}
                quote={quotes.get(instrument.symbol)}
              />
            ))}
          </tbody>
        ))}
      </table>
    </div>
  )
}

function TableHead() {
  const th = 'px-2 py-2 text-right font-medium sm:px-3'
  return (
    <thead className="text-xs text-muted">
      <tr>
        <th scope="col" className="px-2 py-2 text-left font-medium sm:px-3">
          Contract
        </th>
        <th scope="col" className={th}>
          Last
        </th>
        <th scope="col" className={`${th} hidden sm:table-cell`}>
          Change
        </th>
        <th scope="col" className={th}>
          Change %
        </th>
        <th scope="col" className={`${th} hidden md:table-cell`}>
          High
        </th>
        <th scope="col" className={`${th} hidden md:table-cell`}>
          Low
        </th>
      </tr>
    </thead>
  )
}

function MarketTableSkeleton() {
  return (
    <div role="status" className="rounded-lg border border-border bg-surface p-3">
      <span className="sr-only">Loading contracts…</span>
      <div className="space-y-3">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="flex items-center justify-between gap-4">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </div>
    </div>
  )
}
