import {
  keepPreviousData,
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { unwrap, walletApi } from '@/api/client'
import { toEnumName, toNumber } from '@/api/convert'
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

export type LedgerEntryType =
  'OpeningBalance' | 'MarginBlocked' | 'MarginReleased' | 'RealisedPnl' | 'Charges' | 'Reset'

export const ledgerEntryTypes: LedgerEntryType[] = [
  'OpeningBalance',
  'MarginBlocked',
  'MarginReleased',
  'RealisedPnl',
  'Charges',
  'Reset',
]

export interface LedgerEntry {
  id: string
  type: LedgerEntryType
  /** Signed: how much this entry changed cash, or blocked margin for the margin types. */
  amount: number | null
  description: string
  createdAt: string
}

export interface LedgerFilters {
  type?: LedgerEntryType
  from?: string
  to?: string
  page: number
  pageSize: number
}

export function useLedger(filters: LedgerFilters) {
  return useQuery({
    queryKey: ['wallet', 'ledger', filters],
    queryFn: async () => {
      const page = await unwrap(
        walletApi.GET('/api/wallet/ledger', {
          params: {
            query: {
              // The schema types the enum as a number; the API binds its name.
              Type: filters.type as unknown as components['schemas']['LedgerEntryType'],
              From: filters.from,
              To: filters.to,
              Page: filters.page,
              PageSize: filters.pageSize,
            },
          },
        }),
      )
      return {
        items: page.items.map((e): LedgerEntry => ({
          id: e.id,
          type: toEnumName(e.type) as LedgerEntryType,
          amount: toNumber(e.amount),
          description: e.description,
          createdAt: e.createdAt,
        })),
        page: toNumber(page.page) ?? 1,
        totalPages: toNumber(page.totalPages) ?? 0,
        totalCount: toNumber(page.totalCount) ?? 0,
      }
    },
    placeholderData: keepPreviousData,
  })
}

/** Back to the starting balance. The backend refuses (422) while any margin is blocked. */
export function useResetWallet() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => toWallet(await unwrap(walletApi.POST('/api/wallet/reset'))),
    onSuccess: (wallet) => {
      queryClient.setQueryData(walletQuery.queryKey, wallet)
      // ['wallet'] also covers the ledger pages.
      void queryClient.invalidateQueries({ queryKey: ['wallet'] })
      void queryClient.invalidateQueries({ queryKey: ['margin'] })
      void queryClient.invalidateQueries({ queryKey: ['pnl'] })
    },
  })
}
