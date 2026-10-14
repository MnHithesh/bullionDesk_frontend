import { istDayStartUtc, istNextDayStartUtc } from './istDays'

describe('IST day bounds', () => {
  it('starts an IST day at 18:30 UTC the evening before', () => {
    expect(istDayStartUtc('2026-10-14')).toBe('2026-10-13T18:30:00.000Z')
  })

  it('ends a day where the next one starts', () => {
    expect(istNextDayStartUtc('2026-10-14')).toBe('2026-10-14T18:30:00.000Z')
    expect(istNextDayStartUtc('2026-12-31')).toBe('2026-12-31T18:30:00.000Z')
  })
})
