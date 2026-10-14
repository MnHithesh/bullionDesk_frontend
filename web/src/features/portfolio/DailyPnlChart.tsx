import { useMemo } from 'react'
import { formatDateIST, formatINR, formatSignedINR } from '@/lib/format'
import { addDays } from '@/lib/istDays'
import type { DailyPnl } from './api'
import { PnlAmount } from './PnlAmount'

const compact = new Intl.NumberFormat('en-IN', {
  notation: 'compact',
  maximumFractionDigits: 1,
  signDisplay: 'exceptZero',
})

const dayLabel = (day: string) => formatDateIST(`${day}T00:00:00+05:30`)
const shortLabel = (day: string) => dayLabel(day).slice(0, 6) // "14 Oct"

/**
 * Net P&L per IST day as columns from one zero baseline: profit grows up in green, loss grows
 * down in red with a hatch. Position (above/below the line), the sign in every label and the
 * hatch carry the meaning, so it reads without colour. Every bar is focusable with a tooltip,
 * and the same numbers are available as a table.
 */
export function DailyPnlChart({ days, from, to }: { days: DailyPnl[]; from: string; to: string }) {
  // Derived data: one slot per calendar day in the range, empty where nothing traded.
  // useMemo keeps it until `days` or the range change, not on every hover re-render.
  const slots = useMemo(() => {
    const byDate = new Map(days.map((d) => [d.date, d]))
    const result: { day: string; pnl: DailyPnl | undefined }[] = []
    for (let day = from; day <= to; day = addDays(day, 1))
      result.push({ day, pnl: byDate.get(day) })
    return result
  }, [days, from, to])

  const nets = days.map((d) => d.net ?? 0)
  const top = Math.max(0, ...nets)
  const bottom = Math.max(0, ...nets.map((n) => -n))
  const span = top + bottom || 1
  const baseline = (top / span) * 100 // % from the top where zero sits

  return (
    <figure className="space-y-3">
      <div className="flex gap-2">
        {/* Y axis: the extremes and zero; the tooltip and table carry every exact value. */}
        <div
          className="relative w-12 shrink-0 font-mono text-[11px] text-muted tabular-nums"
          aria-hidden="true"
        >
          {top > 0 && (
            <span className="absolute top-0 right-0 -translate-y-1/2">{compact.format(top)}</span>
          )}
          <span className="absolute right-0 -translate-y-1/2" style={{ top: `${baseline}%` }}>
            0
          </span>
          {bottom > 0 && (
            <span className="absolute right-0 bottom-0 translate-y-1/2">
              {compact.format(-bottom)}
            </span>
          )}
        </div>

        <div className="relative h-56 flex-1">
          <div
            className="absolute inset-x-0 border-t border-border"
            style={{ top: `${baseline}%` }}
            aria-hidden="true"
          />
          <ol aria-label="Daily net P&L" className="absolute inset-0 flex items-stretch gap-0.5">
            {slots.map(({ day, pnl }, index) => {
              const net = pnl?.net ?? 0
              const height = (Math.abs(net) / span) * 100
              const up = net >= 0
              const label = pnl
                ? `${dayLabel(day)}: net ${formatSignedINR(pnl.net)}, ${pnl.trades} ${pnl.trades === 1 ? 'trade' : 'trades'}`
                : `${dayLabel(day)}: no trades`
              return (
                <li key={day} className="group relative flex flex-1 justify-center">
                  <button
                    type="button"
                    aria-label={label}
                    className="absolute inset-0 rounded focus-visible:bg-bg"
                  />
                  {pnl && net !== 0 && (
                    <span
                      aria-hidden="true"
                      className={`pointer-events-none absolute w-full max-w-6 ${
                        up ? 'rounded-t bg-up' : 'rounded-b bg-down loss-hatch'
                      }`}
                      style={
                        up
                          ? { bottom: `${100 - baseline}%`, height: `max(${height}%, 2px)` }
                          : { top: `${baseline}%`, height: `max(${height}%, 2px)` }
                      }
                    />
                  )}
                  <span
                    role="tooltip"
                    className={`pointer-events-none absolute bottom-full z-10 mb-1 hidden rounded-md border border-border bg-surface px-2 py-1 text-xs whitespace-nowrap shadow-md group-focus-within:block group-hover:block ${
                      // Open the tooltip towards the middle so it never spills off the card.
                      index < slots.length / 2 ? 'left-0' : 'right-0'
                    }`}
                  >
                    <span className="block text-muted">{dayLabel(day)}</span>
                    {pnl ? (
                      <>
                        <PnlAmount value={pnl.net} /> · {pnl.trades}{' '}
                        {pnl.trades === 1 ? 'trade' : 'trades'}
                      </>
                    ) : (
                      'No trades'
                    )}
                  </span>
                </li>
              )
            })}
          </ol>
        </div>
      </div>
      <div
        className="ml-14 flex justify-between font-mono text-[11px] text-muted"
        aria-hidden="true"
      >
        <span>{shortLabel(from)}</span>
        <span>{shortLabel(to)}</span>
      </div>

      <details className="text-sm">
        <summary className="cursor-pointer text-muted">Show as table</summary>
        <table className="mt-2 w-full text-sm">
          <thead className="text-xs text-muted">
            <tr>
              <th scope="col" className="py-1 text-left font-medium">
                Day (IST)
              </th>
              <th scope="col" className="py-1 text-right font-medium">
                Trades
              </th>
              <th scope="col" className="py-1 text-right font-medium">
                Realised
              </th>
              <th scope="col" className="py-1 text-right font-medium">
                Charges
              </th>
              <th scope="col" className="py-1 text-right font-medium">
                Net
              </th>
            </tr>
          </thead>
          <tbody>
            {days.map((d) => (
              <tr key={d.date} className="border-t border-border">
                <th scope="row" className="py-1 text-left font-normal">
                  {dayLabel(d.date)}
                </th>
                <td className="py-1 text-right font-mono tabular-nums">{d.trades}</td>
                <td className="py-1 text-right">
                  <PnlAmount value={d.realised} />
                </td>
                <td className="py-1 text-right font-mono tabular-nums">{formatINR(d.charges)}</td>
                <td className="py-1 text-right">
                  <PnlAmount value={d.net} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  )
}
