import type { Candle } from './api'
import { applyQuote, candleStart } from './candles'

const utc = (iso: string) => Date.parse(iso) / 1000

describe('candleStart', () => {
  it('aligns minute candles to the minute', () => {
    expect(candleStart(utc('2026-10-14T15:37:42Z'), '1m')).toBe(utc('2026-10-14T15:37:00Z'))
    expect(candleStart(utc('2026-10-14T15:37:42Z'), '5m')).toBe(utc('2026-10-14T15:35:00Z'))
  })

  it('aligns hourly candles to IST hours (UTC half past)', () => {
    // 15:10 UTC is 20:40 IST, so the candle started at 20:00 IST = 14:30 UTC.
    expect(candleStart(utc('2026-10-14T15:10:00Z'), '1h')).toBe(utc('2026-10-14T14:30:00Z'))
    expect(candleStart(utc('2026-10-14T15:30:00Z'), '1h')).toBe(utc('2026-10-14T15:30:00Z'))
  })
})

describe('applyQuote', () => {
  const last: Candle = {
    time: utc('2026-10-14T15:37:00Z'),
    open: 100,
    high: 105,
    low: 98,
    close: 102,
  }

  it('updates close, high and low within the same candle', () => {
    expect(applyQuote(last, 107, '2026-10-14T15:37:30Z', '1m')).toEqual({
      ...last,
      high: 107,
      close: 107,
    })
    expect(applyQuote(last, 97, '2026-10-14T15:37:30Z', '1m')).toEqual({
      ...last,
      low: 97,
      close: 97,
    })
  })

  it('starts a new candle when the quote is in the next period', () => {
    expect(applyQuote(last, 103, '2026-10-14T15:38:05Z', '1m')).toEqual({
      time: utc('2026-10-14T15:38:00Z'),
      open: 103,
      high: 103,
      low: 103,
      close: 103,
    })
  })

  it('ignores a quote older than the last candle', () => {
    expect(applyQuote(last, 90, '2026-10-14T15:36:59Z', '1m')).toBeNull()
  })

  it('starts the first candle on an empty chart', () => {
    expect(applyQuote(undefined, 50, '2026-10-14T15:37:30Z', '1m')).toMatchObject({
      time: utc('2026-10-14T15:37:00Z'),
      open: 50,
    })
  })
})
