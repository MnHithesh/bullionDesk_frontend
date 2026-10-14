import type { RiskStatus } from './api'

/** Which band equity sits in, by the thresholds the backend reports. */
export type GaugeZone = 'safe' | 'marginCall' | 'squareOff' | 'none'

export interface GaugeLayout {
  zone: GaugeZone
  /** Positions along the bar, in % of its width (0 = left edge). */
  equityPct: number
  maintenancePct: number
  squareOffPct: number
}

const clamp = (n: number) => Math.min(100, Math.max(0, n))

/**
 * Lays out the margin gauge: equity as a fill, with the maintenance and square-off levels as
 * markers. The scale runs from 0 to the larger of equity and maintenance plus 25% headroom, so
 * the markers never sit on the right edge. Equity at or above maintenance is safe; below it, a
 * margin call; at or below the square-off level, square-off. With no requirement (no positions)
 * there is nothing to measure against.
 *
 * Only for drawing. The status shown in words comes from the backend, which adds hysteresis
 * (it stays in a margin call until equity recovers past the threshold with some room).
 */
export function gaugeLayout(
  equity: number | null,
  maintenance: number | null,
  squareOff: number | null,
): GaugeLayout {
  if (equity === null || !maintenance || maintenance <= 0) {
    return { zone: 'none', equityPct: 0, maintenancePct: 0, squareOffPct: 0 }
  }
  const floor = squareOff ?? 0
  const max = Math.max(equity, maintenance) * 1.25
  const pct = (value: number) => clamp((value / max) * 100)

  const zone: GaugeZone =
    equity <= floor ? 'squareOff' : equity < maintenance ? 'marginCall' : 'safe'

  return {
    zone,
    equityPct: pct(Math.max(0, equity)),
    maintenancePct: pct(maintenance),
    squareOffPct: pct(floor),
  }
}

/** Words, colour token and icon for a backend status: the label always carries the meaning. */
export const statusPresentation: Record<
  RiskStatus,
  { label: string; tone: 'up' | 'warning' | 'down'; icon: string; summary: string }
> = {
  Normal: {
    label: 'Normal',
    tone: 'up',
    icon: '✓',
    summary: 'Equity covers the maintenance margin.',
  },
  MarginCall: {
    label: 'Margin call',
    tone: 'warning',
    icon: '!',
    summary:
      'Equity is below the maintenance margin. Close or reduce positions to bring it back above.',
  },
  SquareOff: {
    label: 'Square-off',
    tone: 'down',
    icon: '✕',
    summary: 'Equity fell below the square-off level. Positions are being closed automatically.',
  },
}
