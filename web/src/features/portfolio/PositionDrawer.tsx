import { Drawer } from '@/components/Drawer'
import { ErrorState } from '@/components/QueryStates'
import { Skeleton } from '@/components/Skeleton'
import { formatDateTimeIST, formatINR, formatNumber } from '@/lib/format'
import { usePosition } from './api'
import { PnlAmount } from './PnlAmount'

/** Position detail from GET /api/positions/{symbol}, with its recent trades. */
export function PositionDrawer({
  symbol,
  onClose,
}: {
  symbol: string | null
  onClose: () => void
}) {
  return (
    <Drawer open={symbol !== null} onClose={onClose}>
      <Drawer.Header>{symbol}</Drawer.Header>
      <Drawer.Body>{symbol && <PositionDetail symbol={symbol} />}</Drawer.Body>
    </Drawer>
  )
}

function PositionDetail({ symbol }: { symbol: string }) {
  const detail = usePosition(symbol)

  if (detail.isPending) {
    return (
      <div role="status" className="space-y-3">
        <span className="sr-only">Loading position…</span>
        <Skeleton className="h-5 w-2/3" />
        <Skeleton className="h-24 w-full" />
      </div>
    )
  }
  if (detail.isError) {
    return (
      <ErrorState
        title="Could not load the position"
        error={detail.error}
        onRetry={() => void detail.refetch()}
      />
    )
  }

  const { position, recentTrades } = detail.data
  return (
    <>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
        <Item
          label="Direction"
          value={`${position.direction} ${position.netLots} ${position.netLots === 1 ? 'lot' : 'lots'}`}
        />
        <Item label="Average price" value={formatNumber(position.averagePrice)} />
        <Item label="Last price" value={formatNumber(position.lastPrice)} />
        <Item label="Required margin" value={formatINR(position.requiredMargin)} />
        <div>
          <dt className="text-muted">Unrealised P&amp;L</dt>
          <dd className="mt-0.5">
            <PnlAmount value={position.unrealisedPnl} />
          </dd>
        </div>
        <div>
          <dt className="text-muted">Realised P&amp;L</dt>
          <dd className="mt-0.5">
            <PnlAmount value={position.realisedPnl} />
          </dd>
        </div>
      </dl>

      <section aria-labelledby="recent-trades">
        <h3 id="recent-trades" className="mb-2 text-sm font-medium">
          Recent trades
        </h3>
        {recentTrades.length === 0 ? (
          <p className="text-sm text-muted">No trades yet.</p>
        ) : (
          <ul className="divide-y divide-border rounded-md border border-border text-sm">
            {recentTrades.map((trade) => (
              <li key={trade.id} className="flex items-center justify-between gap-3 px-3 py-2">
                <div>
                  <span className={trade.side === 'Buy' ? 'text-up' : 'text-down'}>
                    {trade.side}
                  </span>{' '}
                  {trade.lots} @{' '}
                  <span className="font-mono tabular-nums">{formatNumber(trade.price)}</span>
                  <span className="block text-xs text-muted">
                    {formatDateTimeIST(trade.executedAt)}
                  </span>
                </div>
                <PnlAmount value={trade.realisedPnl} className="text-xs" />
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  )
}

function Item({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-muted">{label}</dt>
      <dd className="mt-0.5 font-mono tabular-nums">{value}</dd>
    </div>
  )
}
