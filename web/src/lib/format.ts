/**
 * Display formatting for money, prices, percentages and times.
 * Display only: values come from the API and are never recalculated here.
 * Missing or non-finite values render as an em dash.
 */

const LOCALE = 'en-IN'
const IST = 'Asia/Kolkata'
export const EMPTY = '—'

type Num = number | null | undefined

const inr = new Intl.NumberFormat(LOCALE, {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const signedInr = new Intl.NumberFormat(LOCALE, {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
  signDisplay: 'exceptZero',
})

const numberCache = new Map<string, Intl.NumberFormat>()

function numberFormat(decimals: number, signed: boolean) {
  const key = `${decimals}:${signed}`
  let fmt = numberCache.get(key)
  if (!fmt) {
    fmt = new Intl.NumberFormat(LOCALE, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
      signDisplay: signed ? 'exceptZero' : 'auto',
    })
    numberCache.set(key, fmt)
  }
  return fmt
}

function isNum(value: Num): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

/** ₹1,23,456.78 */
export function formatINR(value: Num): string {
  return isNum(value) ? inr.format(value) : EMPTY
}

/** P&L with an explicit sign: +₹1,234.50, -₹1,234.50, ₹0.00 */
export function formatSignedINR(value: Num): string {
  return isNum(value) ? signedInr.format(value) : EMPTY
}

/** A price or quantity without the currency symbol: 72,450.00 */
export function formatNumber(value: Num, decimals = 2): string {
  return isNum(value) ? numberFormat(decimals, false).format(value) : EMPTY
}

/** A signed change without the currency symbol: +125.00, -40.50 */
export function formatSignedNumber(value: Num, decimals = 2): string {
  return isNum(value) ? numberFormat(decimals, true).format(value) : EMPTY
}

/**
 * Percentages arrive in percentage points (1.25 means 1.25%), not fractions.
 * formatPercent(1.25) → "1.25%", formatPercent(-0.4, { signed: true }) → "-0.40%"
 */
export function formatPercent(value: Num, { signed = false, decimals = 2 } = {}): string {
  return isNum(value) ? `${numberFormat(decimals, signed).format(value)}%` : EMPTY
}

export type Direction = 'up' | 'down' | 'flat'

/** Which way a change or P&L points, for colour and arrow choice. */
export function direction(value: Num): Direction {
  if (!isNum(value) || value === 0) return 'flat'
  return value > 0 ? 'up' : 'down'
}

type DateInput = string | number | Date | null | undefined

function toDate(value: DateInput): Date | null {
  if (value === null || value === undefined || value === '') return null
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

const istDateTime = new Intl.DateTimeFormat(LOCALE, {
  timeZone: IST,
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

const istDate = new Intl.DateTimeFormat(LOCALE, {
  timeZone: IST,
  day: '2-digit',
  month: 'short',
  year: 'numeric',
})

const istTime = new Intl.DateTimeFormat(LOCALE, {
  timeZone: IST,
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
})

/** 14 Oct 2026, 07:49 IST */
export function formatDateTimeIST(value: DateInput): string {
  const date = toDate(value)
  return date ? `${istDateTime.format(date)} IST` : EMPTY
}

/** 14 Oct 2026 */
export function formatDateIST(value: DateInput): string {
  const date = toDate(value)
  return date ? istDate.format(date) : EMPTY
}

/** 07:49:46 (for quote and trade times) */
export function formatTimeIST(value: DateInput): string {
  const date = toDate(value)
  return date ? istTime.format(date) : EMPTY
}
