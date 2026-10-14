import {
  keepPreviousData,
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { orderApi, portfolioApi, unwrap } from '@/api/client'
import { toEnumName, toNumber } from '@/api/convert'
import type { components } from '@/api/schema/portfolio'
import { invalidateAfterOrderChange, toOrderDetail, type OrderDetail } from '@/features/orders/api'

type Schemas = components['schemas']

export interface Position {
  id: string
  symbol: string
  underlying: string
  direction: 'Long' | 'Short'
  netLots: number
  averagePrice: number | null
  lastPrice: number | null
  unrealisedPnl: number | null
  realisedPnl: number | null
  requiredMargin: number | null
  updatedAt: string
}

export interface Trade {
  id: string
  orderId: string | null
  symbol: string
  side: 'Buy' | 'Sell'
  lots: number
  price: number | null
  realisedPnl: number | null
  charges: number | null
  kind: string
  executedAt: string
}

export interface TradeCharges {
  turnover: number | null
  brokerage: number | null
  exchangeFee: number | null
  sebiFee: number | null
  commodityTransactionTax: number | null
  stampDuty: number | null
  gst: number | null
  total: number | null
}

export interface PnlSummary {
  realised: number | null
  charges: number | null
  netRealised: number | null
  unrealised: number | null
  total: number | null
  trades: number
}

export interface DailyPnl {
  /** IST trading day, yyyy-mm-dd. */
  date: string
  realised: number | null
  charges: number | null
  net: number | null
  trades: number
}

export interface TradeFilters {
  symbol?: string
  from?: string
  to?: string
  page: number
  pageSize: number
}

type TradeJson = Omit<Schemas['TradeResponse'], 'side' | 'kind'> & {
  side: number | string
  kind: number | string
}

const int = (v: number | string | null | undefined) => toNumber(v) ?? 0

export function toPosition(raw: Schemas['PositionResponse']): Position {
  return {
    id: raw.id,
    symbol: raw.symbol,
    underlying: raw.underlying,
    direction: raw.direction === 'Short' ? 'Short' : 'Long',
    netLots: int(raw.netLots),
    averagePrice: toNumber(raw.averagePrice),
    lastPrice: toNumber(raw.lastPrice),
    unrealisedPnl: toNumber(raw.unrealisedPnl),
    realisedPnl: toNumber(raw.realisedPnl),
    requiredMargin: toNumber(raw.requiredMargin),
    updatedAt: raw.updatedAt,
  }
}

export function toTrade(raw: TradeJson): Trade {
  return {
    id: raw.id,
    orderId: raw.orderId,
    symbol: raw.symbol,
    side: toEnumName(raw.side) as Trade['side'],
    lots: int(raw.lots),
    price: toNumber(raw.price),
    realisedPnl: toNumber(raw.realisedPnl),
    charges: toNumber(raw.charges),
    kind: toEnumName(raw.kind),
    executedAt: raw.executedAt,
  }
}

export function toPnlSummary(raw: Schemas['PnlSummaryResponse']): PnlSummary {
  return {
    realised: toNumber(raw.realised),
    charges: toNumber(raw.charges),
    netRealised: toNumber(raw.netRealised),
    unrealised: toNumber(raw.unrealised),
    total: toNumber(raw.total),
    trades: int(raw.trades),
  }
}

/** Positions refresh every 2 seconds: their P&L moves with the price. */
export const positionsQuery = queryOptions({
  queryKey: ['positions'],
  queryFn: async () => (await unwrap(portfolioApi.GET('/api/positions'))).map(toPosition),
  refetchInterval: 2_000,
})

export function usePositions() {
  return useQuery(positionsQuery)
}

export function usePosition(symbol: string | null) {
  return useQuery({
    queryKey: ['positions', symbol],
    queryFn: async () => {
      const raw = await unwrap(
        portfolioApi.GET('/api/positions/{symbol}', { params: { path: { symbol: symbol! } } }),
      )
      return {
        position: toPosition(raw.position),
        recentTrades: raw.recentTrades.map((t) => toTrade(t as TradeJson)),
      }
    },
    enabled: symbol !== null,
    refetchInterval: 2_000,
  })
}

/** P&L summary; `live` polls it alongside the positions (the header's total unrealised). */
export function usePnl({ live = false } = {}) {
  return useQuery({
    queryKey: ['pnl', 'summary'],
    queryFn: async () => toPnlSummary(await unwrap(portfolioApi.GET('/api/pnl'))),
    refetchInterval: live ? 2_000 : false,
  })
}

/** `from` and `to` are IST days (yyyy-mm-dd), both inclusive. */
export function useDailyPnl(range: { from: string; to: string }) {
  return useQuery({
    queryKey: ['pnl', 'daily', range],
    queryFn: async () =>
      (
        await unwrap(
          portfolioApi.GET('/api/pnl/daily', {
            params: { query: { From: range.from, To: range.to } },
          }),
        )
      ).map((d): DailyPnl => ({
        date: d.date,
        realised: toNumber(d.realised),
        charges: toNumber(d.charges),
        net: toNumber(d.net),
        trades: int(d.trades),
      })),
  })
}

export function useTrades(filters: TradeFilters) {
  return useQuery({
    queryKey: ['trades', filters],
    queryFn: async () => {
      const page = await unwrap(
        portfolioApi.GET('/api/trades', {
          params: {
            query: {
              Symbol: filters.symbol,
              From: filters.from,
              To: filters.to,
              Page: filters.page,
              PageSize: filters.pageSize,
            },
          },
        }),
      )
      return {
        items: page.items.map((t) => toTrade(t as TradeJson)),
        page: int(page.page),
        totalPages: int(page.totalPages),
        totalCount: int(page.totalCount),
      }
    },
    placeholderData: keepPreviousData,
  })
}

export function useTradeCharges(tradeId: string | null) {
  return useQuery({
    queryKey: ['trades', 'charges', tradeId],
    queryFn: async () => {
      const c = await unwrap(
        portfolioApi.GET('/api/trades/{id}/charges', { params: { path: { id: tradeId! } } }),
      )
      return {
        turnover: toNumber(c.turnover),
        brokerage: toNumber(c.brokerage),
        exchangeFee: toNumber(c.exchangeFee),
        sebiFee: toNumber(c.sebiFee),
        commodityTransactionTax: toNumber(c.commodityTransactionTax),
        stampDuty: toNumber(c.stampDuty),
        gst: toNumber(c.gst),
        total: toNumber(c.total),
      } satisfies TradeCharges
    },
    enabled: tradeId !== null,
    // A trade's charges never change once booked.
    staleTime: Infinity,
  })
}

/**
 * Closes one position (symbol) or all of them (null) with market orders placed by the backend.
 * The response lists those orders; positions, P&L and funds refresh as they fill.
 */
export function useSquareOff() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (symbol: string | null): Promise<OrderDetail[]> =>
      (await unwrap(orderApi.POST('/api/orders/square-off', { body: { symbol } }))).map((d) =>
        toOrderDetail(d as Parameters<typeof toOrderDetail>[0]),
      ),
    onSuccess: () => {
      void invalidateAfterOrderChange(queryClient)
      for (const key of ['positions', 'pnl', 'trades']) {
        void queryClient.invalidateQueries({ queryKey: [key] })
      }
    },
  })
}
