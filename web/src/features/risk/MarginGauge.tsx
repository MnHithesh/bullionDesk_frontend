import { formatINR } from '@/lib/format'
import { gaugeLayout, type GaugeZone } from './gauge'

const fill: Record<GaugeZone, string> = {
  safe: 'bg-up',
  marginCall: 'bg-warning',
  squareOff: 'bg-down',
  none: 'bg-border',
}

/**
 * Equity against the maintenance and square-off levels as a horizontal gauge. Built on
 * role="meter" with a text value, so assistive tech reads the numbers, and each marker is
 * labelled in text beneath the bar: the colour is never the only cue.
 */
export function MarginGauge({
  equity,
  maintenance,
  squareOff,
}: {
  equity: number | null
  maintenance: number | null
  squareOff: number | null
}) {
  const layout = gaugeLayout(equity, maintenance, squareOff)

  if (layout.zone === 'none') {
    return (
      <p className="text-sm text-muted">
        No open positions, so there is no maintenance margin to measure equity against.
      </p>
    )
  }

  return (
    <div>
      <div
        role="meter"
        aria-label="Equity against maintenance margin"
        aria-valuemin={0}
        aria-valuemax={maintenance ?? 0}
        aria-valuenow={Math.max(0, equity ?? 0)}
        aria-valuetext={`Equity ${formatINR(equity)}; maintenance ${formatINR(maintenance)}; square-off level ${formatINR(squareOff)}`}
        data-zone={layout.zone}
        className="relative h-4 overflow-hidden rounded-full bg-bg ring-1 ring-border"
      >
        {/* Danger bands behind the fill: below square-off, then up to maintenance. */}
        <div
          className="absolute inset-y-0 left-0 bg-down/25 loss-hatch"
          style={{ width: `${layout.squareOffPct}%` }}
        />
        <div
          className="absolute inset-y-0 bg-warning/20"
          style={{
            left: `${layout.squareOffPct}%`,
            width: `${layout.maintenancePct - layout.squareOffPct}%`,
          }}
        />
        <div
          className={`absolute inset-y-1 left-0 rounded-full ${fill[layout.zone]}`}
          style={{ width: `${layout.equityPct}%` }}
        />
        <Marker pct={layout.squareOffPct} />
        <Marker pct={layout.maintenancePct} />
      </div>

      <div className="relative mt-1 h-10 text-xs" aria-hidden="true">
        <MarkerLabel pct={layout.squareOffPct} title="Square-off" value={formatINR(squareOff)} />
        <MarkerLabel
          pct={layout.maintenancePct}
          title="Maintenance"
          value={formatINR(maintenance)}
        />
      </div>
    </div>
  )
}

function Marker({ pct }: { pct: number }) {
  return (
    <div className="absolute inset-y-0 w-0.5 bg-text" style={{ left: `calc(${pct}% - 1px)` }} />
  )
}

function MarkerLabel({ pct, title, value }: { pct: number; title: string; value: string }) {
  // Anchor labels near the edges inward so they never overflow the card.
  const align =
    pct < 15 ? 'left-0 text-left' : pct > 85 ? 'right-0 text-right' : '-translate-x-1/2 text-center'
  return (
    <div
      className={`absolute top-0 whitespace-nowrap ${align}`}
      style={pct < 15 || pct > 85 ? undefined : { left: `${pct}%` }}
    >
      <span className="block text-muted">{title}</span>
      <span className="font-mono tabular-nums">{value}</span>
    </div>
  )
}
