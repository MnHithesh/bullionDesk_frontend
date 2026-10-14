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
