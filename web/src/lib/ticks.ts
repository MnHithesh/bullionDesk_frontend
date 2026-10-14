/**
 * Whether a price lies on the contract's tick grid (e.g. tick 1 → 136195 yes, 136195.5 no).
 * Validation only; the backend rounds and checks again. Works on the ratio with a small tolerance
 * because binary floating point can't represent ticks like 0.05 exactly.
 */
export function isOnTick(price: number, tickSize: number): boolean {
  if (!(tickSize > 0)) return true
  const steps = price / tickSize
  return Math.abs(steps - Math.round(steps)) < 1e-9 * Math.max(1, Math.abs(steps))
}

/** Number of decimals a tick size has (1 → 0, 0.05 → 2), for showing prices on that grid. */
export function tickDecimals(tickSize: number): number {
  const text = String(tickSize)
  const dot = text.indexOf('.')
  return dot === -1 ? 0 : text.length - dot - 1
}
