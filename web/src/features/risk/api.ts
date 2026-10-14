import { keepPreviousData, queryOptions, useQuery } from '@tanstack/react-query'
import { riskApi, unwrap } from '@/api/client'
import { toEnumName, toNumber } from '@/api/convert'
import type { components } from '@/api/schema/risk'

type Schemas = components['schemas']

export type RiskStatus = 'Normal' | 'MarginCall' | 'SquareOff'

export interface PositionRisk {
  symbol: string
  netLots: number
  averagePrice: number | null
  markPrice: number | null
  unrealisedPnl: number | null
  maintenanceMargin: number | null
}

export interface Margin {
  cash: number | null
  equity: number | null
  blockedMargin: number | null
  availableFunds: number | null
  unrealisedPnl: number | null
  maintenanceRequired: number | null
  squareOffLevel: number | null
  shortfall: number | null
  utilisationPercent: number | null
  status: RiskStatus
  positions: PositionRisk[]
}

export type MarginEventKind = 'MarginCall' | 'SquareOff' | 'Recovered'

export interface MarginEvent {
  id: string
  kind: MarginEventKind
  equity: number | null
  maintenanceRequired: number | null
  symbol: string | null
  lots: number | null
  at: string
}

// The generated schema types enums as numbers; the API sends their names.
type MarginJson = Omit<Schemas['MarginResponse'], 'status'> & { status: number | string }

export function toMargin(raw: MarginJson): Margin {
  return {
    cash: toNumber(raw.cash),
    equity: toNumber(raw.equity),
    blockedMargin: toNumber(raw.blockedMargin),
    availableFunds: toNumber(raw.availableFunds),
    unrealisedPnl: toNumber(raw.unrealisedPnl),
    maintenanceRequired: toNumber(raw.maintenanceRequired),
    squareOffLevel: toNumber(raw.squareOffLevel),
    shortfall: toNumber(raw.shortfall),
    utilisationPercent: toNumber(raw.utilisationPercent),
    status: toEnumName(raw.status) as RiskStatus,
    positions: raw.positions.map((p) => ({
      symbol: p.symbol,
      netLots: toNumber(p.netLots) ?? 0,
      averagePrice: toNumber(p.averagePrice),
      markPrice: toNumber(p.markPrice),
      unrealisedPnl: toNumber(p.unrealisedPnl),
      maintenanceMargin: toNumber(p.maintenanceMargin),
    })),
  }
}

export const marginQuery = queryOptions({
  queryKey: ['margin'],
  queryFn: async () => toMargin(await unwrap(riskApi.GET('/api/margin'))),
  refetchInterval: 5_000,
})

/**
 * Margin for the top bar and the banner (every 5 s). The Risk page asks for the same key every
 * 2 s; TanStack polls a shared query at the shortest interval any mounted observer asks for, so
 * the whole app speeds up while the Risk page is open and slows down again when it closes.
 */
export function useMargin({ refetchInterval = 5_000 }: { refetchInterval?: number } = {}) {
  return useQuery({ ...marginQuery, refetchInterval })
}

export function useMarginCalls(page: number, pageSize = 20) {
  return useQuery({
    queryKey: ['margin', 'calls', page, pageSize],
    queryFn: async () => {
      const result = await unwrap(
        riskApi.GET('/api/margin/calls', { params: { query: { Page: page, PageSize: pageSize } } }),
      )
      return {
        items: result.items.map((e): MarginEvent => ({
          id: e.id,
          kind: toEnumName(e.kind) as MarginEventKind,
          equity: toNumber(e.equity),
          maintenanceRequired: toNumber(e.maintenanceRequired),
          symbol: e.symbol,
          lots: toNumber(e.lots),
          at: e.at,
        })),
        page: toNumber(result.page) ?? 1,
        totalPages: toNumber(result.totalPages) ?? 0,
        totalCount: toNumber(result.totalCount) ?? 0,
      }
    },
    placeholderData: keepPreviousData,
  })
}
