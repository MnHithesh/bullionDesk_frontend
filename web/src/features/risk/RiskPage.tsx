import { useState } from 'react'
import { PageTitle } from '@/components/PageTitle'
import { Link } from 'react-router'
import { Pagination } from '@/components/Pagination'
import { EmptyState, ErrorState, LoadingState } from '@/components/QueryStates'
import { PnlAmount } from '@/features/portfolio/PnlAmount'
import { formatDateTimeIST, formatINR, formatNumber, formatPercent } from '@/lib/format'
import { useMargin, useMarginCalls, type Margin, type MarginEventKind } from './api'
import { statusPresentation } from './gauge'
import { MarginGauge } from './MarginGauge'
import { RiskStatusBadge } from './RiskStatusBadge'

export function RiskPage() {
  const margin = useMargin({ refetchInterval: 2_000 })

  return (
    <div className="space-y-6">
      <PageTitle title="Risk" />
      <h1 className="text-2xl font-semibold tracking-tight">Risk</h1>
      {margin.isPending ? (
        <LoadingState label="Loading margin" variant="block" />
      ) : margin.isError ? (
        <ErrorState
          title="Could not load margin"
          error={margin.error}
          onRetry={() => void margin.refetch()}
        />
      ) : (
        <MarginOverview margin={margin.data} />
      )}
      <MarginHistory />
    </div>
  )
}

function MarginOverview({ margin }: { margin: Margin }) {
  const presentation = statusPresentation[margin.status]
  return (
    <>
      <section
        aria-labelledby="health-heading"
        className="space-y-5 rounded-lg border border-border bg-surface p-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="health-heading" className="text-sm font-medium">
            Margin health
          </h2>
          <span aria-live="polite">
            <RiskStatusBadge status={margin.status} />
          </span>
        </div>
        <p className="text-sm text-muted">{presentation.summary}</p>
        <MarginGauge
          equity={margin.equity}
          maintenance={margin.maintenanceRequired}
          squareOff={margin.squareOffLevel}
        />
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-3 lg:grid-cols-6">
          <Figure label="Equity" value={formatINR(margin.equity)} />
          <Figure label="Maintenance" value={formatINR(margin.maintenanceRequired)} />
          <Figure label="Square-off level" value={formatINR(margin.squareOffLevel)} />
          <Figure label="Utilisation" value={formatPercent(margin.utilisationPercent)} />
          <Figure
            label="Shortfall"
            value={formatINR(margin.shortfall)}
            emphasis={(margin.shortfall ?? 0) > 0}
          />
          <Figure label="Blocked margin" value={formatINR(margin.blockedMargin)} />
        </dl>
      </section>

      <section
        aria-labelledby="pos-risk-heading"
        className="rounded-lg border border-border bg-surface"
      >
        <h2 id="pos-risk-heading" className="border-b border-border px-4 py-2 text-sm font-medium">
          By position
        </h2>
        {margin.positions.length === 0 ? (
          <p className="px-4 py-6 text-sm text-muted">
            No open positions.{' '}
            <Link to="/markets" className="text-accent underline">
              Go to markets
            </Link>
          </p>
        ) : (
          <div className="relative overflow-x-auto">
            <table className="w-full min-w-[32rem] text-sm">
              <thead className="text-xs text-muted">
                <tr>
                  <th scope="col" className="px-3 py-2 text-left font-medium">
                    Contract
                  </th>
                  <th scope="col" className="px-3 py-2 text-right font-medium">
                    Net lots
                  </th>
                  <th scope="col" className="px-3 py-2 text-right font-medium">
                    Mark
                  </th>
                  <th scope="col" className="px-3 py-2 text-right font-medium">
                    Maintenance
                  </th>
                  <th scope="col" className="px-3 py-2 text-right font-medium">
                    Unrealised P&amp;L
                  </th>
                </tr>
              </thead>
              <tbody>
                {margin.positions.map((p) => (
                  <tr key={p.symbol} className="border-t border-border">
                    <th scope="row" className="px-3 py-2.5 text-left font-medium">
                      {p.symbol}
                    </th>
                    <td className="px-3 py-2.5 text-right font-mono tabular-nums">
                      {p.netLots > 0 ? `+${p.netLots}` : p.netLots}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono tabular-nums">
                      {formatNumber(p.markPrice)}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono tabular-nums">
                      {formatINR(p.maintenanceMargin)}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <PnlAmount value={p.unrealisedPnl} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  )
}

const kindLabel: Record<MarginEventKind, { label: string; className: string; icon: string }> = {
  MarginCall: { label: 'Margin call', className: 'text-warning', icon: '!' },
  SquareOff: { label: 'Auto square-off', className: 'text-down', icon: '✕' },
  Recovered: { label: 'Recovered', className: 'text-up', icon: '✓' },
}

function MarginHistory() {
  const [page, setPage] = useState(1)
  const calls = useMarginCalls(page)

  return (
    <section aria-labelledby="history-heading" className="space-y-3">
      <h2 id="history-heading" className="text-lg font-semibold">
        Margin call history
      </h2>
      {calls.isPending ? (
        <LoadingState label="Loading margin call history" count={3} />
      ) : calls.isError ? (
        <ErrorState
          title="Could not load history"
          error={calls.error}
          onRetry={() => void calls.refetch()}
        />
      ) : calls.data.items.length === 0 ? (
        <EmptyState title="No margin calls">
          Margin calls and automatic square-offs are listed here.
        </EmptyState>
      ) : (
        <>
          <ol className="divide-y divide-border rounded-lg border border-border bg-surface text-sm">
            {calls.data.items.map((e) => {
              const k = kindLabel[e.kind] ?? kindLabel.MarginCall
              return (
                <li
                  key={e.id}
                  className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-4 py-3"
                >
                  <span className={`font-medium ${k.className}`}>
                    <span aria-hidden="true" className="font-mono">
                      {k.icon}{' '}
                    </span>
                    {k.label}
                    {e.symbol && (
                      <span className="text-text">
                        {' '}
                        · {e.symbol}
                        {e.lots !== null && ` (${e.lots} ${e.lots === 1 ? 'lot' : 'lots'})`}
                      </span>
                    )}
                  </span>
                  <span className="text-muted">
                    Equity {formatINR(e.equity)} vs maintenance {formatINR(e.maintenanceRequired)}
                  </span>
                  <time dateTime={e.at} className="font-mono text-xs text-muted">
                    {formatDateTimeIST(e.at)}
                  </time>
                </li>
              )
            })}
          </ol>
          <Pagination
            page={calls.data.page}
            totalPages={calls.data.totalPages}
            totalCount={calls.data.totalCount}
            noun={['event', 'events']}
            onPage={setPage}
          />
        </>
      )}
    </section>
  )
}

function Figure({ label, value, emphasis }: { label: string; value: string; emphasis?: boolean }) {
  return (
    <div>
      <dt className="text-muted">{label}</dt>
      <dd className={`mt-0.5 font-mono tabular-nums ${emphasis ? 'font-semibold text-down' : ''}`}>
        {value}
      </dd>
    </div>
  )
}
