import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { Alert } from '@/components/Alert'
import { Button } from '@/components/Button'
import { TextField } from '@/components/TextField'
import { formatINR, formatNumber } from '@/lib/format'
import { applyServerErrors, submitErrorMessage } from '@/lib/forms'
import { useDebouncedValue } from '@/lib/useDebouncedValue'
import { tickDecimals } from '@/lib/ticks'
import type { Instrument } from '@/features/markets/api'
import { useOrderPreview, usePlaceOrder, type OrderInput } from './api'
import { OrderPreviewPanel } from './OrderPreviewPanel'
import { OrderTracker } from './OrderTracker'
import { orderTicketSchema, type TicketValues } from './ticketSchema'

const PREVIEW_DEBOUNCE_MS = 300
const fields = ['side', 'type', 'lots', 'limitPrice'] as const

type Step =
  { kind: 'edit' } | { kind: 'confirm'; input: OrderInput } | { kind: 'placed'; orderId: string }

/** Buy/sell ticket on the instrument page: edit → confirm → live status. */
export function OrderTicket({
  instrument,
  lastPrice,
}: {
  instrument: Instrument
  lastPrice: number | null
}) {
  const [step, setStep] = useState<Step>({ kind: 'edit' })
  const tickSize = instrument.tickSize ?? 0
  const schema = useMemo(() => orderTicketSchema(tickSize), [tickSize])

  const form = useForm<TicketValues>({
    resolver: zodResolver(schema),
    mode: 'onChange',
    defaultValues: { side: 'Buy', type: 'Market', lots: 1, limitPrice: null },
  })
  const { register, control, handleSubmit, setValue, getValues, setError, formState } = form
  const values = useWatch({ control }) as TicketValues

  // Preview input: only a valid ticket, and only once typing pauses. The JSON string is a stable
  // value to debounce (a new object every render would restart the timer forever).
  const parsed = schema.safeParse(values)
  const inputKey = parsed.success ? JSON.stringify(toInput(instrument.symbol, parsed.data)) : null
  const debouncedKey = useDebouncedValue(inputKey, PREVIEW_DEBOUNCE_MS)
  const previewInput = debouncedKey ? (JSON.parse(debouncedKey) as OrderInput) : null
  const preview = useOrderPreview(previewInput)

  // Server-side field errors from the preview (e.g. above the maximum lots) go on the fields.
  useEffect(() => {
    if (preview.error) applyServerErrors(preview.error, setError, fields)
  }, [preview.error, setError])

  const place = usePlaceOrder()
  const [submitError, setSubmitError] = useState<string | null>(null)

  if (step.kind === 'placed') {
    return (
      <TicketFrame>
        <OrderTracker
          orderId={step.orderId}
          onNewOrder={() => {
            place.reset()
            setStep({ kind: 'edit' })
          }}
        />
      </TicketFrame>
    )
  }

  if (step.kind === 'confirm') {
    const { input } = step
    const confirmPreview = preview.data
    return (
      <TicketFrame>
        <h3 className="font-medium">Confirm order</h3>
        <dl className="mt-3 space-y-1.5 text-sm">
          <Summary label="Contract" value={input.symbol} />
          <Summary label="Side" value={input.side} />
          <Summary label="Lots" value={String(input.lots)} />
          <Summary
            label="Price"
            value={
              input.type === 'Market'
                ? 'Market'
                : `Limit ${formatNumber(input.limitPrice, tickDecimals(tickSize))}`
            }
          />
          <Summary label="Required margin" value={formatINR(confirmPreview?.requiredMargin)} />
          <Summary label="Est. charges" value={formatINR(confirmPreview?.charges.total)} />
        </dl>
        {submitError && (
          <div className="mt-3">
            <Alert>{submitError}</Alert>
          </div>
        )}
        <div className="mt-4 flex gap-2">
          <Button
            variant="secondary"
            onClick={() => setStep({ kind: 'edit' })}
            disabled={place.isPending}
          >
            Back
          </Button>
          <Button
            className="flex-1"
            variant={input.side === 'Sell' ? 'sell' : 'buy'}
            loading={place.isPending}
            onClick={async () => {
              setSubmitError(null)
              try {
                const detail = await place.mutateAsync(input)
                setStep({ kind: 'placed', orderId: detail.order.id })
              } catch (error) {
                const message = submitErrorMessage(error, setError, fields)
                if (message) setSubmitError(message)
                else setStep({ kind: 'edit' }) // field errors: show them on the form
              }
            }}
          >
            Place {input.side.toLowerCase()} order
          </Button>
        </div>
      </TicketFrame>
    )
  }

  const onReview = handleSubmit((data) => {
    setSubmitError(null)
    setStep({ kind: 'confirm', input: toInput(instrument.symbol, data) })
  })

  const lots = Number.isFinite(values.lots) ? values.lots : 0
  const setLots = (next: number) =>
    setValue('lots', Math.max(1, next), { shouldValidate: true, shouldDirty: true })

  return (
    <TicketFrame>
      <form onSubmit={onReview} noValidate className="space-y-4" aria-label="Order ticket">
        <Controller
          control={control}
          name="side"
          render={({ field }) => (
            <Segmented
              label="Side"
              value={field.value}
              onChange={field.onChange}
              options={[
                { value: 'Buy', className: 'aria-checked:bg-up aria-checked:text-white' },
                { value: 'Sell', className: 'aria-checked:bg-down aria-checked:text-white' },
              ]}
            />
          )}
        />

        <div>
          <label htmlFor="ticket-lots" className="block text-sm font-medium">
            Lots
          </label>
          <div className="mt-1 flex">
            <StepButton
              label="One lot fewer"
              onClick={() => setLots(lots - 1)}
              disabled={lots <= 1}
            >
              −
            </StepButton>
            <input
              id="ticket-lots"
              type="number"
              inputMode="numeric"
              min={1}
              step={1}
              aria-invalid={formState.errors.lots ? true : undefined}
              aria-describedby={formState.errors.lots ? 'ticket-lots-error' : 'ticket-lots-hint'}
              className="w-full min-w-0 border-y border-border bg-surface px-3 py-2 text-center font-mono tabular-nums aria-invalid:border-down"
              {...register('lots', {
                setValueAs: (v: string) => (v === '' ? Number.NaN : Number(v)),
              })}
            />
            <StepButton label="One lot more" onClick={() => setLots(lots + 1)}>
              +
            </StepButton>
          </div>
          {formState.errors.lots ? (
            <p id="ticket-lots-error" className="mt-1 text-sm text-down">
              {formState.errors.lots.message}
            </p>
          ) : (
            <p id="ticket-lots-hint" className="mt-1 text-xs text-muted">
              1 lot = {formatNumber(instrument.lotSize, 0)} {instrument.lotUnit}
            </p>
          )}
        </div>

        <Controller
          control={control}
          name="type"
          render={({ field }) => (
            <Segmented
              label="Order type"
              value={field.value}
              onChange={(type) => {
                field.onChange(type)
                // Start a new limit order at the current price, which is already on the tick grid.
                if (type === 'Limit' && getValues('limitPrice') === null && lastPrice !== null) {
                  setValue('limitPrice', lastPrice, { shouldValidate: true })
                }
              }}
              options={[{ value: 'Market' }, { value: 'Limit' }]}
            />
          )}
        />

        {values.type === 'Limit' && (
          <TextField
            label="Limit price"
            type="number"
            inputMode="decimal"
            step={tickSize || 'any'}
            min={0}
            hint={`Tick size ${formatNumber(tickSize, tickDecimals(tickSize))}`}
            error={formState.errors.limitPrice?.message}
            className="[&_input]:font-mono"
            {...register('limitPrice', {
              setValueAs: (v: string) => (v === '' ? null : Number(v)),
            })}
          />
        )}

        <div className="border-t border-border pt-4">
          <OrderPreviewPanel
            preview={preview.data}
            isLoading={preview.isPending && preview.fetchStatus !== 'idle'}
            stale={preview.isPlaceholderData || inputKey !== debouncedKey}
            error={preview.error}
            invalid={!parsed.success}
          />
        </div>

        {submitError && <Alert>{submitError}</Alert>}

        <Button type="submit" variant={values.side === 'Sell' ? 'sell' : 'buy'} className="w-full">
          Review {values.side === 'Sell' ? 'sell' : 'buy'} order
        </Button>
      </form>
    </TicketFrame>
  )
}

function toInput(symbol: string, values: TicketValues): OrderInput {
  return {
    symbol,
    side: values.side,
    lots: values.lots,
    type: values.type,
    limitPrice: values.type === 'Limit' ? values.limitPrice : null,
  }
}

function TicketFrame({ children }: { children: ReactNode }) {
  return (
    <section aria-label="Place an order" className="rounded-lg border border-border bg-surface p-4">
      {children}
    </section>
  )
}

/**
 * A two-option toggle (Buy/Sell, Market/Limit) as a radio group: one tab stop, arrow keys switch.
 * A controlled component: it shows `value` and reports changes; the form owns the state.
 */
function Segmented<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: T
  onChange: (value: T) => void
  options: { value: T; className?: string }[]
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="grid grid-cols-2 gap-1 rounded-md bg-bg p-1"
    >
      {options.map((option) => {
        const checked = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={checked}
            tabIndex={checked ? 0 : -1}
            onClick={() => onChange(option.value)}
            onKeyDown={(e) => {
              if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
                e.preventDefault()
                const other = options.find((o) => o.value !== value)!
                onChange(other.value)
                ;(
                  e.currentTarget.parentElement?.querySelector(
                    '[aria-checked="false"]',
                  ) as HTMLElement | null
                )?.focus()
              }
            }}
            className={`rounded px-3 py-1.5 text-sm font-medium text-muted transition-colors aria-checked:bg-surface aria-checked:text-text aria-checked:shadow-sm ${option.className ?? ''}`}
          >
            {option.value}
          </button>
        )
      })}
    </div>
  )
}

function StepButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string
  onClick: () => void
  disabled?: boolean
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className="w-10 shrink-0 border border-border bg-bg text-lg first:rounded-l-md last:rounded-r-md disabled:opacity-40"
    >
      {children}
    </button>
  )
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted">{label}</dt>
      <dd className="font-mono tabular-nums">{value}</dd>
    </div>
  )
}
