import type { Candle, CandleInterval } from './api'

const intervalSeconds: Record<CandleInterval, number> = { '1m': 60, '5m': 300, '1h': 3600 }

/** IST is UTC+05:30. Candles are aligned to IST clock boundaries, like the backend's bars. */
const IST_OFFSET_SECONDS = 5.5 * 3600

/** Start of the candle (UTC seconds) that a moment falls into. */
export function candleStart(utcSeconds: number, interval: CandleInterval): number {
  const size = intervalSeconds[interval]
  return Math.floor((utcSeconds + IST_OFFSET_SECONDS) / size) * size - IST_OFFSET_SECONDS
}

/**
 * Folds a live quote into the chart's last candle, so the chart moves between history fetches.
 * Returns the candle to draw: the last one with a new close (and high/low stretched), a new
 * candle when the quote starts the next period, or null when the quote is older than the chart.
 * This only shapes what is drawn; the backend's bars stay the source of truth on the next fetch.
 */
export function applyQuote(
  last: Candle | undefined,
  price: number,
  timestamp: string,
  interval: CandleInterval,
): Candle | null {
  const time = candleStart(Math.floor(Date.parse(timestamp) / 1000), interval)
  if (!last || time > last.time) return { time, open: price, high: price, low: price, close: price }
  if (time < last.time) return null
  return {
    ...last,
    high: Math.max(last.high, price),
    low: Math.min(last.low, price),
    close: price,
  }
}
