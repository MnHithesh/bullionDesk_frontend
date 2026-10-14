import { Button } from '@/components/Button'
import { Dialog } from '@/components/Dialog'
import { ErrorState } from '@/components/QueryStates'
import { Skeleton } from '@/components/Skeleton'
import { formatDateTimeIST, formatINR, formatNumber } from '@/lib/format'
import { useTradeCharges, type Trade, type TradeCharges } from './api'

const rows: [keyof TradeCharges, string][] = [
  ['brokerage', 'Brokerage'],
  ['exchangeFee', 'Exchange transaction charges'],
  ['sebiFee', 'SEBI turnover fee'],
  ['commodityTransactionTax', 'Commodity transaction tax (CTT)'],
  ['stampDuty', 'Stamp duty'],
  ['gst', 'GST'],
]

/** A trade's charges laid out like a broker's contract note, from GET /api/trades/{id}/charges. */
export function ContractNote({ trade, onClose }: { trade: Trade | null; onClose: () => void }) {
  return (
    <Dialog open={trade !== null} onClose={onClose} title="Contract note">
      {trade && <ContractNoteBody trade={trade} />}
      <div className="mt-4 flex justify-end">
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
      </div>
    </Dialog>
  )
}

function ContractNoteBody({ trade }: { trade: Trade }) {
  const charges = useTradeCharges(trade.id)

  return (
    <div className="space-y-4 text-sm">
      <dl className="grid grid-cols-2 gap-x-4 gap-y-1">
        <dt className="text-muted">Contract</dt>
        <dd className="text-right font-medium">{trade.symbol}</dd>
        <dt className="text-muted">Trade</dt>
        <dd className="text-right">
          {trade.side} {trade.lots} @ <span className="font-mono">{formatNumber(trade.price)}</span>
        </dd>
        <dt className="text-muted">Executed</dt>
        <dd className="text-right">{formatDateTimeIST(trade.executedAt)}</dd>
      </dl>

      {charges.isPending ? (
        <div role="status" className="space-y-2">
          <span className="sr-only">Loading charges…</span>
          {rows.map(([key]) => (
            <Skeleton key={key} className="h-4 w-full" />
          ))}
        </div>
      ) : charges.isError ? (
        <ErrorState
          title="Could not load charges"
          error={charges.error}
          onRetry={() => void charges.refetch()}
        />
      ) : (
        <table className="w-full border-collapse font-mono text-xs tabular-nums">
          <caption className="sr-only">Charges for this trade</caption>
          <tbody>
            <tr className="border-y border-border">
              <th scope="row" className="py-1.5 text-left font-sans font-normal text-muted">
                Turnover
              </th>
              <td className="py-1.5 text-right">{formatINR(charges.data.turnover)}</td>
            </tr>
            {rows.map(([key, label]) => (
              <tr key={key} className="border-b border-border/60">
                <th scope="row" className="py-1.5 text-left font-sans font-normal">
                  {label}
                </th>
                <td className="py-1.5 text-right">{formatINR(charges.data[key])}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-text/70">
              <th scope="row" className="py-2 text-left font-sans font-semibold">
                Total charges
              </th>
              <td className="py-2 text-right font-semibold">{formatINR(charges.data.total)}</td>
            </tr>
          </tfoot>
        </table>
      )}
    </div>
  )
}
