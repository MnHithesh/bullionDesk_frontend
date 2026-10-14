import { addDays, istDayStartUtc, istNextDayStartUtc, istToday } from './istDays'

describe('IST day bounds', () => {
  it('starts an IST day at 18:30 UTC the evening before', () => {
    expect(istDayStartUtc('2026-10-14')).toBe('2026-10-13T18:30:00.000Z')
  })

  it('ends a day where the next one starts', () => {
    expect(istNextDayStartUtc('2026-10-14')).toBe('2026-10-14T18:30:00.000Z')
    expect(istNextDayStartUtc('2026-12-31')).toBe('2026-12-31T18:30:00.000Z')
  })
})

describe('istToday and addDays', () => {
  it('uses the IST date, which is a day ahead late in the UTC evening', () => {
    expect(istToday(new Date('2026-10-14T17:00:00Z'))).toBe('2026-10-14')
    expect(istToday(new Date('2026-10-14T19:00:00Z'))).toBe('2026-10-15')
  })

  it('steps across month and year ends', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01')
    expect(addDays('2027-01-01', -1)).toBe('2026-12-31')
  })
})
