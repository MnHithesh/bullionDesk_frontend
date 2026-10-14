import {
  keepPreviousData,
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query'
import { orderApi, unwrap } from '@/api/client'
import { toEnumName, toNumber } from '@/api/convert'
import type { components } from '@/api/schema/order'

type Schemas = components['schemas']

export type OrderSide = 'Buy' | 'Sell'
export type OrderType = 'Market' | 'Limit'
export type OrderStatus = 'Pending' | 'Open' | 'Filled' | 'Rejected' | 'Cancelled'

export const orderStatuses: OrderStatus[] = ['Pending', 'Open', 'Filled', 'Rejected', 'Cancelled']
const finalStatuses: OrderStatus[] = ['Filled', 'Rejected', 'Cancelled']

export function isFinal(status: OrderStatus) {
  return finalStatuses.includes(status)
}

/** True when the backend rejected the order because the wallet couldn't cover its margin. */
export function isInsufficientFunds(order: Pick<Order, 'status' | 'statusReason'>) {
  return order.status === 'Rejected' && /insufficient funds/i.test(order.statusReason ?? '')
}

export interface Order {
  id: string
  symbol: string
  underlying: string
  side: OrderSide
  type: OrderType
  lots: number
  limitPrice: number | null
  referencePrice: number | null
  requiredMargin: number | null
  status: OrderStatus
  statusReason: string | null
  origin: string
  createdAt: string
  updatedAt: string
}

export interface OrderStatusChange {
  status: OrderStatus
  note: string | null
  at: string
}

export interface Fill {
  id: string
  lots: number
  price: number | null
  filledAt: string
}

export interface OrderDetail {
  order: Order
  history: OrderStatusChange[]
  fills: Fill[]
}

export interface Charges {
  brokerage: number | null
  exchangeFee: number | null
  sebiFee: number | null
  commodityTransactionTax: number | null
  stampDuty: number | null
  gst: number | null
  total: number | null
}

export interface OrderPreview {
  referencePrice: number | null
  currentPosition: number
  openingLots: number
  closingLots: number
  requiredMargin: number | null
  turnover: number | null
  charges: Charges
}

export interface OrderInput {
  symbol: string
  side: OrderSide
  lots: number
  type: OrderType
  limitPrice: number | null
}

export interface OrderFilters {
  status?: OrderStatus
  symbol?: string
  /** UTC instants (ISO). */
  from?: string
  to?: string
  page: number
  pageSize: number
}

export interface OrderPage {
  items: Order[]
  page: number
  totalPages: number
  totalCount: number
}

// The generated schema types enums as numbers; the API sends and accepts their names.
type Wire<T, K extends keyof T> = Omit<T, K> & { [P in K]: number | string }
type OrderJson = Wire<Schemas['OrderResponse'], 'side' | 'type' | 'status' | 'origin'>
type OrderDetailJson = {
  order: OrderJson
  history: Wire<Schemas['OrderStatusChangeResponse'], 'status'>[]
  fills: Schemas['FillResponse'][]
}

const int = (v: number | string | null | undefined) => toNumber(v) ?? 0

export function toOrder(raw: OrderJson): Order {
  return {
    id: raw.id,
    symbol: raw.symbol,
    underlying: raw.underlying,
    side: toEnumName(raw.side) as OrderSide,
    type: toEnumName(raw.type) as OrderType,
    lots: int(raw.lots),
    limitPrice: toNumber(raw.limitPrice),
    referencePrice: toNumber(raw.referencePrice),
    requiredMargin: toNumber(raw.requiredMargin),
    status: toEnumName(raw.status) as OrderStatus,
    statusReason: raw.statusReason,
    origin: toEnumName(raw.origin),
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  }
}

export function toOrderDetail(raw: OrderDetailJson): OrderDetail {
  return {
    order: toOrder(raw.order),
    history: raw.history.map((h) => ({
      status: toEnumName(h.status) as OrderStatus,
      note: h.note,
      at: h.at,
    })),
    fills: raw.fills.map((f) => ({
      id: f.id,
      lots: int(f.lots),
      price: toNumber(f.price),
      filledAt: f.filledAt,
    })),
  }
}

export function toOrderPreview(raw: Wire<Schemas['OrderPreviewResponse'], 'side'>): OrderPreview {
  const c = raw.estimatedCharges
  return {
    referencePrice: toNumber(raw.referencePrice),
    currentPosition: int(raw.currentPosition),
    openingLots: int(raw.openingLots),
    closingLots: int(raw.closingLots),
    requiredMargin: toNumber(raw.requiredMargin),
    turnover: toNumber(raw.turnover),
    charges: {
      brokerage: toNumber(c.brokerage),
      exchangeFee: toNumber(c.exchangeFee),
      sebiFee: toNumber(c.sebiFee),
      commodityTransactionTax: toNumber(c.commodityTransactionTax),
      stampDuty: toNumber(c.stampDuty),
      gst: toNumber(c.gst),
      total: toNumber(c.total ?? raw.estimatedChargesTotal),
    },
  }
}

// The request bodies are typed with numeric enums too; the backend binds names.
const body = (input: OrderInput) => input as unknown as Schemas['PlaceOrderRequest']

/** Every order query starts with 'orders', so one invalidateQueries({ queryKey: ['orders'] }) refreshes them all. */
export const orderKeys = {
  all: ['orders'] as const,
  list: (filters: OrderFilters) => ['orders', 'list', filters] as const,
  detail: (id: string) => ['orders', 'detail', id] as const,
  preview: (input: OrderInput) => ['orders', 'preview', input] as const,
}

export function previewQuery(input: OrderInput) {
  return queryOptions({
    queryKey: orderKeys.preview(input),
    queryFn: async () =>
      toOrderPreview(await unwrap(orderApi.POST('/api/orders/preview', { body: body(input) }))),
    // Margin depends on the live price; a preview older than a few seconds is refetched on change.
    staleTime: 5_000,
  })
}

/**
 * Preview for the ticket's current input. `input` should already be debounced; null (an invalid
 * form) disables the query. keepPreviousData keeps the last numbers on screen while the next load.
 */
export function useOrderPreview(input: OrderInput | null) {
  return useQuery({
    ...previewQuery(
      input ?? { symbol: '', side: 'Buy', lots: 0, type: 'Market', limitPrice: null },
    ),
    enabled: input !== null,
    placeholderData: keepPreviousData,
    retry: false,
  })
}

/**
 * One order, polled every second until it reaches a final status. refetchInterval as a function
 * sees the latest data, so polling stops by itself once the order is Filled, Rejected or Cancelled.
 */
export function useOrder(id: string | null) {
  return useQuery({
    queryKey: orderKeys.detail(id ?? ''),
    queryFn: async () =>
      toOrderDetail(
        await unwrap(orderApi.GET('/api/orders/{id}', { params: { path: { id: id! } } })),
      ),
    enabled: id !== null,
    refetchInterval: (query) => {
      const status = query.state.data?.order.status
      return status && isFinal(status) ? false : 1_000
    },
  })
}

export function useOrders(filters: OrderFilters) {
  return useQuery({
    queryKey: orderKeys.list(filters),
    queryFn: async () => {
      const page = await unwrap(
        orderApi.GET('/api/orders', {
          params: {
            query: {
              Status: filters.status as unknown as Schemas['OrderStatus'],
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
        items: page.items.map((o) => toOrder(o as OrderJson)),
        page: int(page.page),
        totalPages: int(page.totalPages),
        totalCount: int(page.totalCount),
      } satisfies OrderPage
    },
    // Keep the current page visible while the next one (or a new filter) loads.
    placeholderData: keepPreviousData,
    // Open limit orders can fill at any moment; refresh while any order on the page is still live.
    refetchInterval: (query) =>
      query.state.data?.items.some((o) => !isFinal(o.status)) ? 3_000 : false,
  })
}

/** After an order changes, everything derived from it is stale: order lists, funds, margin. */
export function invalidateAfterOrderChange(queryClient: QueryClient) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: orderKeys.all }),
    queryClient.invalidateQueries({ queryKey: ['wallet'] }),
    queryClient.invalidateQueries({ queryKey: ['margin'] }),
  ])
}

export function usePlaceOrder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: OrderInput) =>
      toOrderDetail(await unwrap(orderApi.POST('/api/orders', { body: body(input) }))),
    onSuccess: (detail) => {
      // Seed the detail cache with the server's answer so the status tracker renders at once.
      queryClient.setQueryData(orderKeys.detail(detail.order.id), detail)
      void queryClient.invalidateQueries({ queryKey: ['orders', 'list'] })
    },
  })
}

export function useModifyOrder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      lots,
      limitPrice,
    }: {
      id: string
      lots: number | null
      limitPrice: number | null
    }) =>
      toOrderDetail(
        await unwrap(
          orderApi.PUT('/api/orders/{id}', {
            params: { path: { id } },
            body: { lots, limitPrice },
          }),
        ),
      ),
    onSuccess: (detail) => {
      queryClient.setQueryData(orderKeys.detail(detail.order.id), detail)
      void invalidateAfterOrderChange(queryClient)
    },
  })
}

export function useCancelOrder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) =>
      toOrderDetail(
        await unwrap(orderApi.DELETE('/api/orders/{id}', { params: { path: { id } } })),
      ),
    onSuccess: (detail) => {
      queryClient.setQueryData(orderKeys.detail(detail.order.id), detail)
    },
  })
}
