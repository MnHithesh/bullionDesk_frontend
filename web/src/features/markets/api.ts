import { queryOptions, useQuery } from '@tanstack/react-query'
import { marketDataApi, unwrap } from '@/api/client'
import { toEnumName, toNumber } from '@/api/convert'
import type { components } from '@/api/schema/marketdata'

type Schemas = components['schemas']

export interface Instrument {
  symbol: string
  underlying: string
  name: string
  type: string
  status: string
  /** UTC instant the contract expires. */
  expiry: string
  /** Trading day of expiry (IST), yyyy-mm-dd. */
  expiryDate: string
  lotSize: number | null
  lotUnit: string
  priceQuotation: string
  multiplier: number | null
  tickSize: number | null
  initialMarginPercent: number | null
  maintenanceMarginPercent: number | null
}

export interface Expiry {
  underlying: string
  symbol: string
  expiryDate: string
}

export interface Quote {
  symbol: string
  underlying: string
  lastPrice: number | null
  change: number | null
  changePercent: number | null
  open: number | null
  high: number | null
  low: number | null
  previousClose: number | null
  timestamp: string
}

export const candleIntervals = ['1m', '5m', '1h'] as const
export type CandleInterval = (typeof candleIntervals)[number]

export interface Candle {
  /** Bucket start, UTC seconds since the epoch (what lightweight-charts calls a UTCTimestamp). */
  time: number
  open: number
  high: number
  low: number
  close: number
}

/** The generated schema says the enums are numbers; on the wire they are names ("FUT", "Active"). */
type InstrumentJson = Omit<Schemas['InstrumentResponse'], 'type' | 'status'> & {
  type: number | string
  status: number | string
}

export function toInstrument(raw: InstrumentJson): Instrument {
  return {
    symbol: raw.symbol,
    underlying: raw.underlying,
    name: raw.name,
    type: toEnumName(raw.type),
    status: toEnumName(raw.status),
    expiry: raw.expiry,
    expiryDate: raw.expiryDate,
    lotSize: toNumber(raw.lotSize),
    lotUnit: raw.lotUnit,
    priceQuotation: raw.priceQuotation,
    multiplier: toNumber(raw.multiplier),
    tickSize: toNumber(raw.tickSize),
    initialMarginPercent: toNumber(raw.initialMarginPercent),
    maintenanceMarginPercent: toNumber(raw.maintenanceMarginPercent),
  }
}

export function toQuote(raw: Schemas['QuoteResponse']): Quote {
  return {
    symbol: raw.symbol,
    underlying: raw.underlying,
    lastPrice: toNumber(raw.lastPrice),
    change: toNumber(raw.change),
    changePercent: toNumber(raw.changePercent),
    open: toNumber(raw.open),
    high: toNumber(raw.high),
    low: toNumber(raw.low),
    previousClose: toNumber(raw.previousClose),
    timestamp: raw.timestamp,
  }
}

export function toCandle(raw: Schemas['Bar']): Candle {
  return {
    time: Math.floor(Date.parse(raw.time) / 1000),
    open: toNumber(raw.open) ?? 0,
    high: toNumber(raw.high) ?? 0,
    low: toNumber(raw.low) ?? 0,
    close: toNumber(raw.close) ?? 0,
  }
}

export const instrumentsQuery = queryOptions({
  queryKey: ['instruments'],
  queryFn: async () => (await unwrap(marketDataApi.GET('/api/instruments'))).map(toInstrument),
  // Contract specs only change when a contract expires or is listed.
  staleTime: 5 * 60_000,
})

export const expiriesQuery = queryOptions({
  queryKey: ['expiries'],
  queryFn: async () =>
    (await unwrap(marketDataApi.GET('/api/expiries'))).map((e): Expiry => ({
      underlying: e.underlying,
      symbol: e.symbol,
      expiryDate: e.expiryDate,
    })),
  staleTime: 5 * 60_000,
})

/**
 * Every quote, polled once a second. The market page and the instrument detail share this one
 * query (same key), so opening a detail view never starts a second poll.
 * refetchIntervalInBackground defaults to false: polling pauses while the browser tab is hidden
 * and resumes (with an immediate refetch) when it becomes visible again.
 */
export const quotesQuery = queryOptions({
  queryKey: ['quotes'],
  queryFn: async () => (await unwrap(marketDataApi.GET('/api/quotes'))).map(toQuote),
  refetchInterval: 1_000,
  refetchIntervalInBackground: false,
})

export function instrumentQuery(symbol: string) {
  return queryOptions({
    queryKey: ['instruments', symbol],
    queryFn: async () =>
      toInstrument(
        await unwrap(
          marketDataApi.GET('/api/instruments/{symbol}', { params: { path: { symbol } } }),
        ),
      ),
    staleTime: 5 * 60_000,
  })
}

export function candlesQuery(symbol: string, interval: CandleInterval) {
  return queryOptions({
    queryKey: ['candles', symbol, interval],
    queryFn: async () =>
      (
        await unwrap(
          marketDataApi.GET('/api/candles/{symbol}', {
            params: { path: { symbol }, query: { Interval: interval } },
          }),
        )
      ).map(toCandle),
    // The chart keeps the last candle current from quotes; history is fetched once per interval.
    staleTime: Infinity,
  })
}

export function useInstruments() {
  return useQuery(instrumentsQuery)
}

export function useExpiries() {
  return useQuery(expiriesQuery)
}

export function useQuotes() {
  return useQuery(quotesQuery)
}

/** One symbol's quote, read from the shared quotes poll. */
export function useQuote(symbol: string) {
  return useQuery({
    ...quotesQuery,
    select: (quotes) => quotes.find((q) => q.symbol === symbol) ?? null,
  })
}

export function useInstrument(symbol: string) {
  return useQuery(instrumentQuery(symbol))
}

export function useCandles(symbol: string, interval: CandleInterval) {
  return useQuery(candlesQuery(symbol, interval))
}
