import { queryOptions, useQuery } from '@tanstack/react-query'
import { unwrap, walletApi } from '@/api/client'
import { toNumber } from '@/api/convert'
import type { components } from '@/api/schema/wallet'

export interface Wallet {
  currency: string
  balance: number | null
  blockedMargin: number | null
  availableFunds: number | null
  updatedAt: string
}

export function toWallet(raw: components['schemas']['WalletResponse']): Wallet {
  return {
    currency: raw.currency,
    balance: toNumber(raw.balance),
    blockedMargin: toNumber(raw.blockedMargin),
    availableFunds: toNumber(raw.availableFunds),
    updatedAt: raw.updatedAt,
  }
}

export const walletQuery = queryOptions({
  queryKey: ['wallet'],
  queryFn: async () => toWallet(await unwrap(walletApi.GET('/api/wallet'))),
  // Funds change when orders fill; a few seconds is fresh enough for the top bar.
  refetchInterval: 5_000,
})

export function useWallet() {
  return useQuery(walletQuery)
}
