import { z } from 'zod'
import { formatNumber } from '@/lib/format'
import { isOnTick, tickDecimals } from '@/lib/ticks'

/** Modify-order rules: same lots and tick checks as the ticket. */
export function modifyOrderSchema(tickSize: number) {
  return z.object({
    lots: z
      .number({ error: 'Enter the number of lots' })
      .int('Lots must be a whole number')
      .min(1, 'At least 1 lot'),
    limitPrice: z
      .number({ error: 'Enter a limit price' })
      .positive('Limit price must be above zero')
      .refine(
        (price) => isOnTick(price, tickSize),
        `Price must be a multiple of the tick size (${formatNumber(tickSize, tickDecimals(tickSize))})`,
      ),
  })
}

export type ModifyValues = z.infer<ReturnType<typeof modifyOrderSchema>>
