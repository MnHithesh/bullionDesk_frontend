import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { isApiError } from '@/api/errors'
import { EmptyState, ErrorState } from '@/components/QueryStates'
import { Skeleton } from '@/components/Skeleton'
import {
  formatDateTimeIST,
  formatINR,
  formatNumber,
  formatPercent,
  formatTimeIST,
} from '@/lib/format'
import {
  candleIntervals,
  useCandles,
  useInstrument,
  useQuote,
  type Candle,
  type CandleInterval,
  type Instrument,
} from './api'
import { CandleChart } from './CandleChart'
import { FlashPrice } from './FlashPrice'
import { PriceChange } from './PriceChange'

const intervalLabel: Record<CandleInterval, string> = {
  '1m': '1 minute',
  '5m': '5 minute',
  '1h': '1 hour',
}

// Stable empty array: a fresh [] on every render would make the chart reset its data each time.
const NO_CANDLES: Candle[] = []

export function InstrumentDetailPage() {
  const { symbol = '' } = useParams()
  const instrument = useInstrument(symbol)

  return (
    <div className="space-y-6">
      <Link to="/markets" className="text-sm text-muted hover:text-text hover:underline">
        ← Markets
      </Link>

      {instrument.isPending ? (
        <div role="status" className="space-y-3">
          <span className="sr-only">Loading contract…</span>
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : instrument.isError ? (
        isApiError(instrument.error) && instrument.error.status === 404 ? (
          <EmptyState title={`No contract called ${symbol}`}>
            It may have expired.{' '}
            <Link to="/markets" className="text-accent underline">
              Back to markets
            </Link>
          </EmptyState>
        ) : (
          <ErrorState
            title="Could not load the contract"
            error={instrument.error}
            onRetry={() => void instrument.refetch()}
          />
        )
      ) : (
        <InstrumentDetail instrument={instrument.data} />
      )}
    </div>
  )
}

function InstrumentDetail({ instrument }: { instrument: Instrument }) {
  const quote = useQuote(instrument.symbol)
  const [interval, setCandleInterval] = useState<CandleInterval>('5m')
  const candles = useCandles(instrument.symbol, interval)
  const last = quote.data

  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{instrument.symbol}</h1>
          <p className="text-sm text-muted">
            {instrument.name} {instrument.type} · {instrument.priceQuotation}
          </p>
        </div>
        <div className="text-right font-mono tabular-nums">
          <div className="text-2xl">
            <FlashPrice value={last?.lastPrice ?? null} />
          </div>
          <div className="text-sm">
            <PriceChange value={last?.change ?? null} percent={last?.changePercent ?? null} />
          </div>
          {last && (
            <div className="text-xs text-muted">as of {formatTimeIST(last.timestamp)} IST</div>
          )}
        </div>
      </header>

      <section
        aria-labelledby="chart-heading"
        className="rounded-lg border border-border bg-surface"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-2">
          <h2 id="chart-heading" className="text-sm font-medium">
            Price chart
          </h2>
          <div role="group" aria-label="Candle interval" className="flex gap-1">
            {candleIntervals.map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={interval === value}
                onClick={() => setCandleInterval(value)}
                className={`rounded px-2.5 py-1 text-xs font-medium ${
                  interval === value
                    ? 'bg-accent text-accent-contrast'
                    : 'text-muted hover:text-text'
                }`}
              >
                {value}
              </button>
            ))}
          </div>
        </div>
        <div className="relative p-2">
          {candles.isError ? (
            <div className="p-2">
              <ErrorState
                title="Could not load the chart"
                error={candles.error}
                onRetry={() => void candles.refetch()}
              />
            </div>
          ) : (
            <>
              <CandleChart
                candles={candles.data ?? NO_CANDLES}
                quote={last}
                interval={interval}
                label={`${intervalLabel[interval]} candlestick chart for ${instrument.symbol}`}
              />
              {candles.isPending && (
                <div
                  role="status"
                  className="absolute inset-2 flex items-center justify-center bg-surface/70"
                >
                  <span className="text-sm text-muted">Loading candles…</span>
                </div>
              )}
              {candles.isSuccess && candles.data.length === 0 && (
                <p className="absolute inset-x-0 top-1/3 text-center text-sm text-muted">
                  No trades yet for this interval.
                </p>
              )}
            </>
          )}
        </div>
      </section>

      <section
        aria-labelledby="spec-heading"
        className="rounded-lg border border-border bg-surface"
      >
        <h2 id="spec-heading" className="border-b border-border px-4 py-2 text-sm font-medium">
          Contract specification
        </h2>
        <dl className="grid grid-cols-1 gap-x-6 gap-y-3 px-4 py-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
          <Spec
            label="Lot size"
            value={`${formatNumber(instrument.lotSize, 0)} ${instrument.lotUnit}`}
          />
          <Spec label="Multiplier" value={formatNumber(instrument.multiplier, 0)} />
          <Spec label="Tick size" value={formatINR(instrument.tickSize)} />
          <Spec label="Initial margin" value={formatPercent(instrument.initialMarginPercent)} />
          <Spec
            label="Maintenance margin"
            value={formatPercent(instrument.maintenanceMarginPercent)}
          />
          <Spec label="Expiry" value={formatDateTimeIST(instrument.expiry)} />
        </dl>
      </section>
    </>
  )
}

function Spec({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-muted">{label}</dt>
      <dd className="mt-0.5 font-mono tabular-nums">{value}</dd>
    </div>
  )
}
