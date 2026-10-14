/** API-shaped sample data (as the backend sends it: enum names, plain numbers). */

export function instrumentJson(symbol: string, underlying: string, expiryDate: string) {
  return {
    symbol,
    underlying,
    name: underlying === 'GOLD' ? 'Gold' : 'Silver',
    type: 'FUT',
    expiry: `${expiryDate}T18:00:00+00:00`,
    expiryDate,
    status: 'Active',
    lotSize: underlying === 'GOLD' ? 1 : 30,
    lotUnit: 'kg',
    priceQuotation: underlying === 'GOLD' ? '₹ per 10 grams' : '₹ per kg',
    multiplier: underlying === 'GOLD' ? 100 : 30,
    tickSize: 1,
    initialMarginPercent: 8,
    maintenanceMarginPercent: 6,
    settlementPrice: null,
  }
}

export function quoteJson(
  symbol: string,
  lastPrice: number,
  change: number,
  changePercent: number,
) {
  return {
    symbol,
    underlying: symbol.startsWith('GOLD') ? 'GOLD' : 'SILVER',
    lastPrice,
    change,
    changePercent,
    open: lastPrice - change,
    high: lastPrice + 10,
    low: lastPrice - 20,
    previousClose: lastPrice - change,
    timestamp: '2026-10-14T10:00:00+00:00',
  }
}

export const instruments = [
  instrumentJson('GOLD26NOVFUT', 'GOLD', '2026-11-05'),
  instrumentJson('GOLD26DECFUT', 'GOLD', '2026-12-05'),
  instrumentJson('SILVER26NOVFUT', 'SILVER', '2026-11-05'),
]

export const quotes = [
  quoteJson('GOLD26NOVFUT', 135468, 29, 0.02),
  quoteJson('GOLD26DECFUT', 136194, 0, 0),
  quoteJson('SILVER26NOVFUT', 130410, -174, -0.13),
]

export const expiries = instruments.map((i) => ({
  underlying: i.underlying,
  symbol: i.symbol,
  expiryDate: i.expiryDate,
  expiry: i.expiry,
}))

export function orderJson(overrides: Record<string, unknown> = {}) {
  return {
    id: 'o-1',
    symbol: 'SILVER26NOVFUT',
    underlying: 'SILVER',
    side: 'Buy',
    type: 'Limit',
    lots: 1,
    limitPrice: 120000,
    referencePrice: 120000,
    marginLots: 1,
    requiredMargin: 360000,
    status: 'Open',
    statusReason: null as string | null,
    origin: 'User',
    createdAt: '2026-10-14T10:00:00+00:00',
    updatedAt: '2026-10-14T10:00:01+00:00',
    ...overrides,
  }
}

export function orderDetailJson(
  order: ReturnType<typeof orderJson>,
  history: { status: string; note: string | null; at: string }[] = [
    { status: 'Pending', note: 'Placed', at: '2026-10-14T10:00:00+00:00' },
  ],
) {
  return { order, history, fills: [] }
}

export const previewJson = {
  symbol: 'GOLD26DECFUT',
  side: 'Buy',
  lots: 2,
  referencePrice: 136142,
  currentPosition: 0,
  openingLots: 2,
  closingLots: 0,
  requiredMargin: 2178272,
  turnover: 27228400,
  estimatedCharges: {
    turnover: 27228400,
    brokerage: 20,
    exchangeFee: 571.8,
    sebiFee: 27.23,
    commodityTransactionTax: 0,
    stampDuty: 544.57,
    gst: 111.43,
    total: 1275.03,
  },
  estimatedChargesTotal: 1275.03,
}

export function positionJson(overrides: Record<string, unknown> = {}) {
  return {
    id: 'p-1',
    symbol: 'SILVER26DECFUT',
    underlying: 'SILVER',
    direction: 'Long',
    netLots: 1,
    averagePrice: 130594,
    lastPrice: 130583,
    unrealisedPnl: -330,
    realisedPnl: -60,
    requiredMargin: 391782,
    multiplier: 30,
    updatedAt: '2026-10-14T17:10:59+00:00',
    ...overrides,
  }
}

export const pnlJson = {
  from: null,
  to: null,
  realised: -60,
  charges: 900.81,
  netRealised: -960.81,
  unrealised: 1250.5,
  total: 289.69,
  trades: 2,
}
