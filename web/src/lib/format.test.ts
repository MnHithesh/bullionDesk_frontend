import {
  direction,
  EMPTY,
  formatDateIST,
  formatDateTimeIST,
  formatINR,
  formatNumber,
  formatPercent,
  formatSignedINR,
  formatSignedNumber,
  formatTimeIST,
} from './format'

describe('formatINR', () => {
  it('uses the rupee symbol, en-IN lakh/crore grouping and 2 decimals', () => {
    expect(formatINR(1234567.891)).toBe('₹12,34,567.89')
    expect(formatINR(10000000)).toBe('₹1,00,00,000.00')
    expect(formatINR(0)).toBe('₹0.00')
  })

  it('keeps the minus sign for negatives', () => {
    expect(formatINR(-1500)).toBe('-₹1,500.00')
  })

  it('renders missing values as an em dash', () => {
    expect(formatINR(null)).toBe(EMPTY)
    expect(formatINR(undefined)).toBe(EMPTY)
    expect(formatINR(Number.NaN)).toBe(EMPTY)
    expect(formatINR(Number.POSITIVE_INFINITY)).toBe(EMPTY)
  })
})

describe('formatSignedINR', () => {
  it('always shows the sign of a P&L except for zero', () => {
    expect(formatSignedINR(1234.5)).toBe('+₹1,234.50')
    expect(formatSignedINR(-1234.5)).toBe('-₹1,234.50')
    expect(formatSignedINR(0)).toBe('₹0.00')
  })
})

describe('formatNumber / formatSignedNumber', () => {
  it('formats prices without a symbol', () => {
    expect(formatNumber(72450)).toBe('72,450.00')
    expect(formatNumber(91234.5, 1)).toBe('91,234.5')
    expect(formatNumber(3, 0)).toBe('3')
  })

  it('signs changes', () => {
    expect(formatSignedNumber(125)).toBe('+125.00')
    expect(formatSignedNumber(-40.5)).toBe('-40.50')
    expect(formatSignedNumber(0)).toBe('0.00')
  })
})

describe('formatPercent', () => {
  it('treats input as percentage points', () => {
    expect(formatPercent(1.25)).toBe('1.25%')
    expect(formatPercent(-0.4)).toBe('-0.40%')
  })

  it('can force a sign', () => {
    expect(formatPercent(0.4, { signed: true })).toBe('+0.40%')
    expect(formatPercent(0, { signed: true })).toBe('0.00%')
  })

  it('renders missing values as an em dash', () => {
    expect(formatPercent(null)).toBe(EMPTY)
  })
})

describe('direction', () => {
  it('maps the sign to up / down / flat', () => {
    expect(direction(5)).toBe('up')
    expect(direction(-0.01)).toBe('down')
    expect(direction(0)).toBe('flat')
    expect(direction(null)).toBe('flat')
  })
})

describe('IST date/time', () => {
  // 02:19:46 UTC is 07:49:46 in India (UTC+5:30), whatever time zone the test machine is in.
  const instant = '2026-10-14T02:19:46Z'

  it('formats date and time in IST', () => {
    expect(formatDateTimeIST(instant)).toBe('14 Oct 2026, 07:49 IST')
    expect(formatDateIST(instant)).toBe('14 Oct 2026')
    expect(formatTimeIST(instant)).toBe('07:49:46')
  })

  it('rolls the date over at IST midnight, not UTC midnight', () => {
    expect(formatDateIST('2026-10-14T19:00:00Z')).toBe('15 Oct 2026')
  })

  it('accepts Date objects and epoch millis', () => {
    const date = new Date(instant)
    expect(formatTimeIST(date)).toBe('07:49:46')
    expect(formatTimeIST(date.getTime())).toBe('07:49:46')
  })

  it('renders missing or invalid input as an em dash', () => {
    expect(formatDateTimeIST(null)).toBe(EMPTY)
    expect(formatDateIST('')).toBe(EMPTY)
    expect(formatTimeIST('not a date')).toBe(EMPTY)
  })
})
