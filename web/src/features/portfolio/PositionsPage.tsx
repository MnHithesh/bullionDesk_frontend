import { useState } from 'react'
import { PageTitle } from '@/components/PageTitle'
import { toast } from '@/components/toast/toastStore'
import { useSearchParams } from 'react-router'
import { errorMessage } from '@/api/errors'
import { Alert } from '@/components/Alert'
import { Button } from '@/components/Button'
import { Dialog } from '@/components/Dialog'
import { EmptyState, ErrorState, LoadingState } from '@/components/QueryStates'
import { Skeleton } from '@/components/Skeleton'
import { formatINR, formatNumber } from '@/lib/format'
import { usePnl, usePositions, useSquareOff, type Position } from './api'
import { PnlAmount } from './PnlAmount'
import { PositionDrawer } from './PositionDrawer'

/** What the confirm dialog is about to close: one symbol, or everything. */
type CloseTarget = { kind: 'one'; position: Position } | { kind: 'all' } | null

export function PositionsPage() {
  const positions = usePositions()
  const pnl = usePnl({ live: true })
  const squareOff = useSquareOff()
  const [params, setParams] = useSearchParams()
  const [target, setTarget] = useState<CloseTarget>(null)
  // Stored state: which closes we asked for. Whether a row is still "closing" is derived from it
  // and the latest positions on every render, so it can't go out of sync.
  const [closeRequested, setCloseRequested] = useState<string[]>([])

  const list = positions.data ?? []
  const open = new Set(list.map((p) => p.symbol))
  const closing = new Set(closeRequested.filter((s) => open.has(s)))
  const selected = params.get('position')

  async function confirmClose() {
    if (!target) return
    const symbol = target.kind === 'one' ? target.position.symbol : null
    try {
      const orders = await squareOff.mutateAsync(symbol)
      toast.success(
        symbol ? `Closing ${symbol}` : 'Closing all positions',
        `${orders.length} market ${orders.length === 1 ? 'order' : 'orders'} placed.`,
      )
      setCloseRequested((prev) => [...prev, ...(symbol ? [symbol] : list.map((p) => p.symbol))])
      setTarget(null)
    } catch {
      // Shown in the dialog from squareOff.error.
    }
  }

  function closeDialog() {
    setTarget(null)
    squareOff.reset()
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <PageTitle title="Positions" />
          <h1 className="text-2xl font-semibold tracking-tight">Positions</h1>
          <p className="mt-1 text-sm text-muted">
            Total unrealised{' '}
            {pnl.data ? (
              <PnlAmount value={pnl.data.unrealised} className="text-base" />
            ) : (
              <Skeleton className="inline-block h-4 w-24 align-middle" />
            )}
          </p>
        </div>
        {list.length > 0 && (
          <Button variant="secondary" onClick={() => setTarget({ kind: 'all' })}>
            Close all
          </Button>
        )}
      </div>

      {positions.isPending ? (
        <LoadingState label="Loading positions" count={3} />
      ) : positions.isError ? (
        <ErrorState
          title="Could not load positions"
          error={positions.error}
          onRetry={() => void positions.refetch()}
        />
      ) : list.length === 0 ? (
        <EmptyState title="No open positions">Filled orders show up here.</EmptyState>
      ) : (
        <div className="relative overflow-x-auto rounded-lg border border-border bg-surface">
          <table className="w-full min-w-[42rem] text-sm">
            <thead className="text-xs text-muted">
              <tr>
                <th scope="col" className="px-3 py-2 text-left font-medium">
                  Contract
                </th>
                <th scope="col" className="px-3 py-2 text-left font-medium">
                  Direction
                </th>
                <th scope="col" className="px-3 py-2 text-right font-medium">
                  Net lots
                </th>
                <th scope="col" className="px-3 py-2 text-right font-medium">
                  Avg price
                </th>
                <th scope="col" className="px-3 py-2 text-right font-medium">
                  Last
                </th>
                <th scope="col" className="px-3 py-2 text-right font-medium">
                  Unrealised P&amp;L
                </th>
                <th scope="col" className="px-3 py-2 text-right font-medium">
                  Margin
                </th>
                <th scope="col" className="px-3 py-2">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {list.map((position) => (
                <tr key={position.symbol} className="border-t border-border">
                  <th scope="row" className="px-3 py-2.5 text-left font-medium">
                    <button
                      type="button"
                      className="hover:underline"
                      onClick={() => setParams({ position: position.symbol })}
                    >
                      {position.symbol}
                    </button>
                  </th>
                  <td className="px-3 py-2.5">
                    <span className={position.direction === 'Long' ? 'text-up' : 'text-down'}>
                      <span aria-hidden="true">{position.direction === 'Long' ? '▲ ' : '▼ '}</span>
                      {position.direction}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono tabular-nums">
                    {position.netLots}
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono tabular-nums">
                    {formatNumber(position.averagePrice)}
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono tabular-nums">
                    {formatNumber(position.lastPrice)}
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <PnlAmount value={position.unrealisedPnl} />
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono tabular-nums">
                    {formatINR(position.requiredMargin)}
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <Button
                      variant="secondary"
                      className="px-2.5 py-1"
                      aria-label={`Close position ${position.symbol}`}
                      disabled={closing.has(position.symbol)}
                      onClick={() => setTarget({ kind: 'one', position })}
                    >
                      {closing.has(position.symbol) ? 'Closing…' : 'Close'}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog
        open={target !== null}
        onClose={closeDialog}
        title={target?.kind === 'one' ? `Close ${target.position.symbol}?` : 'Close all positions?'}
      >
        <p className="text-sm">
          {target?.kind === 'one'
            ? `Places a market order to ${target.position.direction === 'Long' ? 'sell' : 'buy'} ${target.position.netLots} ${target.position.netLots === 1 ? 'lot' : 'lots'} at the current price. Unrealised P&L becomes realised, and the margin is released.`
            : `Places market orders to close all ${list.length} open ${list.length === 1 ? 'position' : 'positions'} at the current prices.`}
        </p>
        {squareOff.isError && (
          <div className="mt-3">
            <Alert title="Could not close">{errorMessage(squareOff.error)}</Alert>
          </div>
        )}
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" onClick={closeDialog} disabled={squareOff.isPending}>
            Keep open
          </Button>
          <Button variant="sell" loading={squareOff.isPending} onClick={() => void confirmClose()}>
            {target?.kind === 'all' ? 'Close all' : 'Close position'}
          </Button>
        </div>
      </Dialog>

      <PositionDrawer symbol={selected} onClose={() => setParams({}, { replace: true })} />
    </div>
  )
}
