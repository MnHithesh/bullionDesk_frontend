/**
 * Date filters are picked as IST calendar days (yyyy-mm-dd) but the API filters on UTC instants.
 * IST has no daylight saving, so a day always starts at 00:00+05:30.
 */
export function istDayStartUtc(day: string): string {
  return new Date(`${day}T00:00:00+05:30`).toISOString()
}

/** The instant the day after `day` starts, as an exclusive upper bound for "up to and including `day`". */
export function istNextDayStartUtc(day: string): string {
  const start = new Date(`${day}T00:00:00+05:30`)
  return new Date(start.getTime() + 24 * 3600 * 1000).toISOString()
}

const istDayFormat = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Kolkata',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

/** Today's IST calendar day as yyyy-mm-dd (en-CA formats dates that way). */
export function istToday(now: Date = new Date()): string {
  return istDayFormat.format(now)
}

/** The IST day `n` days after (or before, if negative) `day`. */
export function addDays(day: string, n: number): string {
  const date = new Date(`${day}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + n)
  return date.toISOString().slice(0, 10)
}
