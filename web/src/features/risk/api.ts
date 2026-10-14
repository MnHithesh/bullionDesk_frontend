import { queryOptions, useQuery } from '@tanstack/react-query'
import { riskApi, unwrap } from '@/api/client'
import { toEnumName, toNumber } from '@/api/convert'
import type { components } from '@/api/schema/risk'

export type RiskStatus = 'Normal' | 'MarginCall' | 'SquareOff'

export interface Margin {
  equity: number | null
  blockedMargin: number | null
  availableFunds: number | null
  maintenanceRequired: number | null
  utilisationPercent: number | null
  status: RiskStatus
}

export function toMargin(raw: components['schemas']['MarginResponse']): Margin {
  return {
    equity: toNumber(raw.equity),
    blockedMargin: toNumber(raw.blockedMargin),
    availableFunds: toNumber(raw.availableFunds),
    maintenanceRequired: toNumber(raw.maintenanceRequired),
    utilisationPercent: toNumber(raw.utilisationPercent),
    status: toEnumName(raw.status) as RiskStatus,
  }
}

export const marginQuery = queryOptions({
  queryKey: ['margin'],
  queryFn: async () => toMargin(await unwrap(riskApi.GET('/api/margin'))),
  refetchInterval: 5_000,
})

export function useMargin() {
  return useQuery(marginQuery)
}
