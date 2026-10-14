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
