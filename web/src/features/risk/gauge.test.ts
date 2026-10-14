import { gaugeLayout } from './gauge'

describe('gaugeLayout thresholds', () => {
  // Maintenance 300k, square-off 150k.
  const at = (equity: number) => gaugeLayout(equity, 300_000, 150_000)

  it('is safe at or above the maintenance level', () => {
    expect(at(1_000_000).zone).toBe('safe')
    expect(at(300_000).zone).toBe('safe')
  })

  it('is a margin call between the square-off level and maintenance', () => {
    expect(at(299_999).zone).toBe('marginCall')
    expect(at(150_001).zone).toBe('marginCall')
  })

  it('is square-off at or below the square-off level, including negative equity', () => {
    expect(at(150_000).zone).toBe('squareOff')
    expect(at(-5_000).zone).toBe('squareOff')
  })

  it('has nothing to measure without a maintenance requirement', () => {
    expect(gaugeLayout(1_000_000, 0, 0).zone).toBe('none')
    expect(gaugeLayout(null, 300_000, 150_000).zone).toBe('none')
  })
})

describe('gaugeLayout positions', () => {
  it('scales to the larger of equity and maintenance with 25% headroom', () => {
    // max = 400k * 1.25 = 500k
    const layout = gaugeLayout(400_000, 300_000, 150_000)
    expect(layout.equityPct).toBeCloseTo(80)
    expect(layout.maintenancePct).toBeCloseTo(60)
    expect(layout.squareOffPct).toBeCloseTo(30)
  })

  it('keeps the markers in order and inside the bar when equity is below maintenance', () => {
    const layout = gaugeLayout(200_000, 300_000, 150_000)
    expect(layout.squareOffPct).toBeLessThan(layout.equityPct)
    expect(layout.equityPct).toBeLessThan(layout.maintenancePct)
    expect(layout.maintenancePct).toBeLessThan(100)
  })

  it('pins negative equity to the left edge', () => {
    expect(gaugeLayout(-5_000, 300_000, 150_000).equityPct).toBe(0)
  })
})
