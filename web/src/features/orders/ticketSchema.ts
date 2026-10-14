import { z } from 'zod'
import { formatNumber } from '@/lib/format'
import { isOnTick, tickDecimals } from '@/lib/ticks'

/**
 * Order ticket rules. Built per contract because the limit price must sit on that contract's
 * tick grid (tick size from the spec, never hard-coded). The backend applies the same rules,
 * plus limits it owns (such as the maximum lots), whose errors are shown on the same fields.
 */
export function orderTicketSchema(tickSize: number) {
  return z
    .object({
      side: z.enum(['Buy', 'Sell']),
      type: z.enum(['Market', 'Limit']),
      lots: z
        .number({ error: 'Enter the number of lots' })
        .int('Lots must be a whole number')
        .min(1, 'At least 1 lot'),
      limitPrice: z.number().nullable(),
    })
    .superRefine((values, ctx) => {
      if (values.type !== 'Limit') return
      const price = values.limitPrice
      if (price === null) {
        ctx.addIssue({ code: 'custom', path: ['limitPrice'], message: 'Enter a limit price' })
      } else if (price <= 0) {
        ctx.addIssue({
          code: 'custom',
          path: ['limitPrice'],
          message: 'Limit price must be above zero',
        })
      } else if (!isOnTick(price, tickSize)) {
        ctx.addIssue({
          code: 'custom',
          path: ['limitPrice'],
          message: `Price must be a multiple of the tick size (${formatNumber(tickSize, tickDecimals(tickSize))})`,
        })
      }
    })
}

export type TicketValues = z.infer<ReturnType<typeof orderTicketSchema>>
