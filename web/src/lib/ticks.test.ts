import { isOnTick, tickDecimals } from './ticks'

describe('isOnTick', () => {
  it.each([
    [136195, 1, true],
    [136195.5, 1, false],
    [72450.05, 0.05, true],
    [72450.07, 0.05, false],
    [0.3, 0.1, true],
    [131000, 50, true],
    [131020, 50, false],
  ])('%d on tick %d → %s', (price, tick, expected) => {
    expect(isOnTick(price, tick)).toBe(expected)
  })
})

describe('tickDecimals', () => {
  it.each([
    [1, 0],
    [0.5, 1],
    [0.05, 2],
  ])('tick %d has %d decimals', (tick, decimals) => {
    expect(tickDecimals(tick)).toBe(decimals)
  })
})
