import { ThemeToggle } from '@/components/ThemeToggle'
import {
  direction,
  formatDateTimeIST,
  formatINR,
  formatNumber,
  formatPercent,
  formatSignedINR,
  formatSignedNumber,
  type Direction,
} from '@/lib/format'

// Placeholder data so the tokens and formatters can be seen before the API is wired up (prompt 2+).
const sampleQuotes = [
  { symbol: 'GOLD DEC', last: 72450, change: 312.5, changePercent: 0.43 },
  { symbol: 'SILVER DEC', last: 91234.5, change: -418, changePercent: -0.46 },
]

export function HomePage() {
  return (
    <div className="min-h-dvh">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
          <span className="text-lg font-semibold tracking-tight">
            Bullion<span className="text-accent">Desk</span>
          </span>
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-6 px-4 py-8">
        <section>
          <h1 className="text-2xl font-semibold tracking-tight">
            Paper trading for gold and silver
          </h1>
          <p className="mt-1 text-muted">
            Simulated market, virtual money. Sign-in and live quotes arrive in the next steps.
          </p>
        </section>

        <section
          aria-labelledby="sample-heading"
          className="rounded-lg border border-border bg-surface"
        >
          <h2
            id="sample-heading"
            className="border-b border-border px-4 py-3 text-sm font-medium text-muted"
          >
            Sample quotes (placeholder)
          </h2>
          <ul className="divide-y divide-border">
            {sampleQuotes.map((quote) => (
              <li key={quote.symbol} className="flex items-center justify-between gap-4 px-4 py-3">
                <span className="font-medium">{quote.symbol}</span>
                <span className="text-right font-mono text-sm tabular-nums">
                  <span className="block">{formatNumber(quote.last)}</span>
                  <Change value={quote.change} percent={quote.changePercent} />
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="grid gap-4 sm:grid-cols-3">
          <Stat label="Available funds" value={formatINR(1000000)} />
          <Stat
            label="Unrealised P&L"
            value={formatSignedINR(-2450.75)}
            tone={direction(-2450.75)}
          />
          <Stat label="As of" value={formatDateTimeIST(new Date())} />
        </section>

        <p className="rounded-md border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-warning">
          Warning token: used for margin calls later on.
        </p>
      </main>
    </div>
  )
}

const toneClass: Record<Direction, string> = {
  up: 'text-up',
  down: 'text-down',
  flat: 'text-muted',
}

const arrow: Record<Direction, string> = { up: '▲', down: '▼', flat: '' }

function Change({ value, percent }: { value: number; percent: number }) {
  const dir = direction(value)
  return (
    <span className={`block ${toneClass[dir]}`}>
      <span aria-hidden="true">{arrow[dir]} </span>
      {formatSignedNumber(value)} ({formatPercent(percent, { signed: true })})
    </span>
  )
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: Direction }) {
  return (
    <div className="rounded-lg border border-border bg-surface px-4 py-3">
      <div className="text-sm text-muted">{label}</div>
      <div className={`mt-1 font-mono text-lg tabular-nums ${tone ? toneClass[tone] : ''}`}>
        {value}
      </div>
    </div>
  )
}
