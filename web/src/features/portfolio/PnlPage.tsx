import type { ReactNode } from 'react'
import { PageTitle } from '@/components/PageTitle'
import { EmptyState, ErrorState, LoadingState } from '@/components/QueryStates'
import { formatINR } from '@/lib/format'
import { addDays, istToday } from '@/lib/istDays'
import { useDailyPnl, usePnl, type PnlSummary } from './api'
import { DailyPnlChart } from './DailyPnlChart'
import { PnlAmount } from './PnlAmount'

const DAYS = 30

/** P&L summary (GET /api/pnl) and the last 30 IST days of net P&L (GET /api/pnl/daily). */
export function PnlPage() {
  const summary = usePnl()
  const to = istToday()
  const from = addDays(to, -(DAYS - 1))
  // Daily P&L takes IST trading days (both inclusive), not UTC instants.
  const daily = useDailyPnl({ from, to })

  return (
    <div className="space-y-6">
      <PageTitle title="Profit & loss" />
      <h1 className="text-2xl font-semibold tracking-tight">Profit &amp; loss</h1>

      {summary.isPending ? (
        <LoadingState label="Loading P&L" variant="cards" />
      ) : summary.isError ? (
        <ErrorState
          title="Could not load P&L"
          error={summary.error}
          onRetry={() => void summary.refetch()}
        />
      ) : (
        <PnlSummaryCards summary={summary.data} />
      )}

      <section
        aria-labelledby="daily-heading"
        className="rounded-lg border border-border bg-surface p-4"
      >
        <h2 id="daily-heading" className="mb-4 text-sm font-medium">
          Daily net P&amp;L, last {DAYS} days (IST)
        </h2>
        {daily.isPending ? (
          <LoadingState label="Loading daily P&L" variant="block" />
        ) : daily.isError ? (
          <ErrorState
            title="Could not load daily P&L"
            error={daily.error}
            onRetry={() => void daily.refetch()}
          />
        ) : daily.data.length === 0 ? (
          <EmptyState title="No closed trades in this period">
            Realised P&amp;L appears once you close or reduce a position.
          </EmptyState>
        ) : (
          <DailyPnlChart days={daily.data} from={from} to={to} />
        )}
      </section>
    </div>
  )
}

export function PnlSummaryCards({ summary }: { summary: PnlSummary }) {
  return (
    <dl className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
      <Card label="Realised" hint="Closed trades, before charges">
        <PnlAmount value={summary.realised} />
      </Card>
      <Card label="Charges" hint={`${summary.trades} ${summary.trades === 1 ? 'trade' : 'trades'}`}>
        <span className="font-mono tabular-nums">{formatINR(summary.charges)}</span>
      </Card>
      <Card label="Net realised" hint="Realised minus charges">
        <PnlAmount value={summary.netRealised} />
      </Card>
      <Card label="Unrealised" hint="Open positions at the last price">
        <PnlAmount value={summary.unrealised} />
      </Card>
      <Card label="Total" hint="Net realised plus unrealised" emphasis>
        <PnlAmount value={summary.total} />
      </Card>
    </dl>
  )
}

function Card({
  label,
  hint,
  emphasis,
  children,
}: {
  label: string
  hint: string
  emphasis?: boolean
  children: ReactNode
}) {
  return (
    <div
      className={`rounded-lg border bg-surface px-4 py-3 ${emphasis ? 'border-accent/60' : 'border-border'}`}
    >
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="mt-1 text-lg">{children}</dd>
      <dd className="mt-0.5 text-xs text-muted">{hint}</dd>
    </div>
  )
}
