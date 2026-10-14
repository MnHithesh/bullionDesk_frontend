import { useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { errorMessage, isApiError } from '@/api/errors'
import { Alert } from '@/components/Alert'
import { Button } from '@/components/Button'
import { Dialog } from '@/components/Dialog'
import { DateField, SelectField } from '@/components/FilterFields'
import { Pagination } from '@/components/Pagination'
import { EmptyState, ErrorState } from '@/components/QueryStates'
import { Skeleton } from '@/components/Skeleton'
import { direction, formatDateTimeIST, formatINR, formatSignedINR } from '@/lib/format'
import { istDayStartUtc, istNextDayStartUtc } from '@/lib/istDays'
import { ledgerEntryTypes, useLedger, useResetWallet, useWallet, type LedgerEntryType } from './api'
import { LedgerIcon } from './LedgerIcon'

const PAGE_SIZE = 20

/** Label and which balance the entry moves. The icon is decorative; the label is the meaning. */
const entryTypes: Record<LedgerEntryType, { label: string; affects: 'Cash' | 'Margin' }> = {
  OpeningBalance: { label: 'Opening balance', affects: 'Cash' },
  MarginBlocked: { label: 'Margin blocked', affects: 'Margin' },
  MarginReleased: { label: 'Margin released', affects: 'Margin' },
  RealisedPnl: { label: 'Realised P&L', affects: 'Cash' },
  Charges: { label: 'Charges', affects: 'Cash' },
  Reset: { label: 'Wallet reset', affects: 'Cash' },
}

const amountTone = { up: 'text-up', down: 'text-down', flat: 'text-muted' }

export function WalletPage() {
  const wallet = useWallet()
  const [resetOpen, setResetOpen] = useState(false)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Wallet</h1>
        <Button variant="secondary" onClick={() => setResetOpen(true)}>
          Reset wallet
        </Button>
      </div>

      {wallet.isPending ? (
        <div role="status" className="grid gap-3 sm:grid-cols-3">
          <span className="sr-only">Loading wallet…</span>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : wallet.isError ? (
        <ErrorState
          title="Could not load the wallet"
          error={wallet.error}
          onRetry={() => void wallet.refetch()}
        />
      ) : (
        <dl className="grid gap-3 sm:grid-cols-3">
          <Card
            label="Balance"
            value={formatINR(wallet.data.balance)}
            hint="Cash, including realised P&L and charges"
          />
          <Card
            label="Blocked margin"
            value={formatINR(wallet.data.blockedMargin)}
            hint="Held for open orders and positions"
          />
          <Card
            label="Available funds"
            value={formatINR(wallet.data.availableFunds)}
            hint="Balance minus blocked margin"
            emphasis
          />
        </dl>
      )}

      <Ledger />

      <ResetDialog
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        blockedMargin={wallet.data?.blockedMargin ?? null}
      />
    </div>
  )
}

function Card({
  label,
  value,
  hint,
  emphasis,
}: {
  label: string
  value: string
  hint: string
  emphasis?: boolean
}) {
  return (
    <div
      className={`rounded-lg border bg-surface px-4 py-3 ${emphasis ? 'border-accent/60' : 'border-border'}`}
    >
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="mt-1 font-mono text-lg tabular-nums">{value}</dd>
      <dd className="mt-0.5 text-xs text-muted">{hint}</dd>
    </div>
  )
}

function Ledger() {
  const [params, setParams] = useSearchParams()
  const type = (params.get('type') as LedgerEntryType | null) ?? undefined
  const from = params.get('from') ?? ''
  const to = params.get('to') ?? ''
  const page = Math.max(1, Number(params.get('page')) || 1)
  const datesInvalid = from !== '' && to !== '' && to < from

  const ledger = useLedger({
    type,
    from: from ? istDayStartUtc(from) : undefined,
    to: to ? istNextDayStartUtc(to) : undefined,
    page,
    pageSize: PAGE_SIZE,
  })

  function setFilter(name: string, value: string) {
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (value) next.set(name, value)
        else next.delete(name)
        if (name !== 'page') next.delete('page')
        return next
      },
      { replace: true },
    )
  }

  const hasFilters = Boolean(type || from || to)

  return (
    <section aria-labelledby="ledger-heading" className="space-y-3">
      <h2 id="ledger-heading" className="text-lg font-semibold">
        Ledger
      </h2>
      <form
        aria-label="Filter ledger"
        onSubmit={(e) => e.preventDefault()}
        className="grid grid-cols-2 gap-3 rounded-lg border border-border bg-surface p-3 sm:grid-cols-3 lg:flex lg:items-end"
      >
        <SelectField
          label="Type"
          value={type ?? ''}
          onChange={(v) => setFilter('type', v)}
          options={ledgerEntryTypes.map((t) => ({ value: t, label: entryTypes[t].label }))}
          allLabel="All types"
        />
        <DateField label="From" value={from} onChange={(v) => setFilter('from', v)} />
        <DateField label="To" value={to} onChange={(v) => setFilter('to', v)} />
        {hasFilters && (
          <Button
            variant="secondary"
            className="col-span-2 sm:col-span-3 lg:col-span-1"
            onClick={() => setParams({}, { replace: true })}
          >
            Clear filters
          </Button>
        )}
      </form>

      {datesInvalid ? (
        <EmptyState title="Check the dates">The “To” date is before the “From” date.</EmptyState>
      ) : ledger.isPending ? (
        <div role="status" className="space-y-3 rounded-lg border border-border bg-surface p-4">
          <span className="sr-only">Loading ledger…</span>
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className="h-5 w-full" />
          ))}
        </div>
      ) : ledger.isError ? (
        <ErrorState
          title="Could not load the ledger"
          error={ledger.error}
          onRetry={() => void ledger.refetch()}
        />
      ) : ledger.data.items.length === 0 ? (
        <EmptyState title={hasFilters ? 'No entries match these filters' : 'No entries yet'} />
      ) : (
        <>
          <ul
            className={`divide-y divide-border rounded-lg border border-border bg-surface transition-opacity ${ledger.isPlaceholderData ? 'opacity-60' : ''}`}
          >
            {ledger.data.items.map((entry) => {
              const t = entryTypes[entry.type] ?? { label: entry.type, affects: 'Cash' as const }
              // Margin moves aren't gains or losses, so only cash entries get profit/loss colours.
              const tone = t.affects === 'Cash' ? amountTone[direction(entry.amount)] : 'text-text'
              return (
                <li key={entry.id} className="flex items-center gap-3 px-4 py-3 text-sm">
                  <span
                    aria-hidden="true"
                    className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-bg text-muted"
                  >
                    <LedgerIcon type={entry.type} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">
                      {t.label}{' '}
                      <span className="rounded border border-border px-1 text-[10px] font-normal tracking-wide text-muted uppercase">
                        {t.affects}
                      </span>
                    </p>
                    <p className="truncate text-muted">{entry.description}</p>
                  </div>
                  <div className="text-right">
                    <p className={`font-mono tabular-nums ${tone}`}>
                      {formatSignedINR(entry.amount)}
                    </p>
                    <time dateTime={entry.createdAt} className="font-mono text-xs text-muted">
                      {formatDateTimeIST(entry.createdAt)}
                    </time>
                  </div>
                </li>
              )
            })}
          </ul>
          <Pagination
            page={ledger.data.page}
            totalPages={ledger.data.totalPages}
            totalCount={ledger.data.totalCount}
            noun={['entry', 'entries']}
            onPage={(p) => setFilter('page', String(p))}
          />
        </>
      )}
    </section>
  )
}

function ResetDialog({
  open,
  onClose,
  blockedMargin,
}: {
  open: boolean
  onClose: () => void
  blockedMargin: number | null
}) {
  const reset = useResetWallet()
  const [done, setDone] = useState(false)
  const refusal = isApiError(reset.error) && reset.error.status === 422 ? reset.error : null

  function close() {
    reset.reset()
    setDone(false)
    onClose()
  }

  return (
    <Dialog open={open} onClose={close} title="Reset wallet?">
      {done ? (
        <p className="text-sm">Your wallet is back to its starting balance.</p>
      ) : (
        <div className="space-y-3 text-sm">
          <p>
            Cash goes back to the starting balance. Your ledger and trade history are kept; the
            reset is added as one more ledger entry.
          </p>
          {(blockedMargin ?? 0) > 0 && !reset.isError && (
            <p className="text-muted">
              {formatINR(blockedMargin)} is blocked right now, so the reset will be refused until it
              is released.
            </p>
          )}
          {refusal ? (
            <Alert title="Reset refused: margin is still blocked">
              {refusal.detail ?? refusal.title} Resetting cash while margin is held for open orders
              or positions would leave them unfunded.
              <span className="mt-2 flex gap-4">
                <Link to="/positions" className="font-medium underline" onClick={close}>
                  Positions
                </Link>
                <Link to="/orders?status=Open" className="font-medium underline" onClick={close}>
                  Open orders
                </Link>
              </span>
            </Alert>
          ) : (
            reset.isError && <Alert title="Could not reset">{errorMessage(reset.error)}</Alert>
          )}
        </div>
      )}
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="secondary" onClick={close} disabled={reset.isPending}>
          {done ? 'Close' : 'Cancel'}
        </Button>
        {!done && (
          <Button
            variant="sell"
            loading={reset.isPending}
            onClick={() => reset.mutate(undefined, { onSuccess: () => setDone(true) })}
          >
            Reset wallet
          </Button>
        )}
      </div>
    </Dialog>
  )
}
