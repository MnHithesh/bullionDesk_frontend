import { orderTicketSchema } from './ticketSchema'

const schema = orderTicketSchema(1)
const market = { side: 'Buy', type: 'Market', lots: 1, limitPrice: null } as const

function errorFor(values: object, field: string) {
  const result = schema.safeParse({ ...market, ...values })
  return result.success ? null : result.error.issues.find((i) => i.path[0] === field)?.message
}

describe('orderTicketSchema', () => {
  it('accepts a market order without a price', () => {
    expect(schema.safeParse(market).success).toBe(true)
  })

  it.each([
    [0, 'At least 1 lot'],
    [-2, 'At least 1 lot'],
    [1.5, 'Lots must be a whole number'],
    [Number.NaN, 'Enter the number of lots'],
  ])('rejects %d lots', (lots, message) => {
    expect(errorFor({ lots }, 'lots')).toBe(message)
  })

  it('requires a positive limit price on a limit order', () => {
    expect(errorFor({ type: 'Limit', limitPrice: null }, 'limitPrice')).toBe('Enter a limit price')
    expect(errorFor({ type: 'Limit', limitPrice: 0 }, 'limitPrice')).toBe(
      'Limit price must be above zero',
    )
  })

  it('requires the limit price to be on the tick grid from the spec', () => {
    expect(errorFor({ type: 'Limit', limitPrice: 136195.5 }, 'limitPrice')).toBe(
      'Price must be a multiple of the tick size (1)',
    )
    expect(errorFor({ type: 'Limit', limitPrice: 136195 }, 'limitPrice')).toBeNull()

    const fine = orderTicketSchema(0.05)
    expect(fine.safeParse({ ...market, type: 'Limit', limitPrice: 72450.05 }).success).toBe(true)
    expect(
      fine.safeParse({ ...market, type: 'Limit', limitPrice: 72450.07 }).error?.issues[0].message,
    ).toBe('Price must be a multiple of the tick size (0.05)')
  })
})
