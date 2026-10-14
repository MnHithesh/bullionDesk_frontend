import { zodResolver } from '@hookform/resolvers/zod'
import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { isApiError } from '@/api/errors'
import { Alert } from '@/components/Alert'
import { Button } from '@/components/Button'
import { Dialog } from '@/components/Dialog'
import { TextField } from '@/components/TextField'
import { formatNumber } from '@/lib/format'
import { submitErrorMessage } from '@/lib/forms'
import { tickDecimals } from '@/lib/ticks'
import { useModifyOrder, type Order } from './api'
import { modifyOrderSchema, type ModifyValues } from './modifySchema'

export function ModifyOrderDialog({
  order,
  tickSize,
  open,
  onClose,
}: {
  order: Order
  tickSize: number
  open: boolean
  onClose: () => void
}) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={`Modify ${order.side.toLowerCase()} ${order.symbol}`}
    >
      <ModifyForm order={order} tickSize={tickSize} onDone={onClose} />
    </Dialog>
  )
}

function ModifyForm({
  order,
  tickSize,
  onDone,
}: {
  order: Order
  tickSize: number
  onDone: () => void
}) {
  const schema = useMemo(() => modifyOrderSchema(tickSize), [tickSize])
  const { register, handleSubmit, setError, formState } = useForm<ModifyValues>({
    resolver: zodResolver(schema),
    defaultValues: { lots: order.lots, limitPrice: order.limitPrice ?? undefined },
  })
  const modify = useModifyOrder()
  const [problem, setProblem] = useState<{ title?: string; text: string } | null>(null)

  const onSubmit = handleSubmit(async ({ lots, limitPrice }) => {
    setProblem(null)
    // Send only what changed; null tells the backend to keep the current value.
    const changedLots = lots !== order.lots ? lots : null
    const changedPrice = limitPrice !== order.limitPrice ? limitPrice : null
    if (changedLots === null && changedPrice === null) {
      setProblem({ text: 'Change the lots or the limit price first.' })
      return
    }
    try {
      await modify.mutateAsync({ id: order.id, lots: changedLots, limitPrice: changedPrice })
      onDone()
    } catch (error) {
      if (isApiError(error) && error.status === 422) {
        setProblem({ title: 'Needs more margin', text: error.detail ?? error.title })
      } else if (isApiError(error) && error.status === 409) {
        setProblem({ title: 'Order can no longer be changed', text: error.detail ?? error.title })
      } else {
        const message = submitErrorMessage(error, setError, ['lots', 'limitPrice'])
        if (message) setProblem({ text: message })
      }
    }
  })

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <p className="text-sm text-muted">
        A change can only use the margin already blocked for this order. Fewer lots, or a buy price
        no higher (sell price no lower), always fits.
      </p>
      <TextField
        label="Lots"
        type="number"
        inputMode="numeric"
        min={1}
        step={1}
        error={formState.errors.lots?.message}
        {...register('lots', { setValueAs: (v: string) => (v === '' ? Number.NaN : Number(v)) })}
      />
      <TextField
        label="Limit price"
        type="number"
        inputMode="decimal"
        step={tickSize || 'any'}
        hint={`Tick size ${formatNumber(tickSize, tickDecimals(tickSize))}`}
        error={formState.errors.limitPrice?.message}
        {...register('limitPrice', {
          setValueAs: (v: string) => (v === '' ? Number.NaN : Number(v)),
        })}
      />
      {problem && (
        <Alert title={problem.title}>
          {problem.text}
          {problem.title === 'Needs more margin' && (
            <span className="mt-1 block">
              To use more margin, cancel this order and place a new one.
            </span>
          )}
        </Alert>
      )}
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onDone} disabled={modify.isPending}>
          Close
        </Button>
        <Button type="submit" loading={modify.isPending}>
          Save changes
        </Button>
      </div>
    </form>
  )
}
