import { Skeleton } from '@/components/Skeleton'
import { formatINR } from '@/lib/format'
import { useWallet } from './api'

/** Available funds from GET /api/wallet, for the top bar and the mobile drawer. */
export function AvailableFunds({ className = '' }: { className?: string }) {
  const wallet = useWallet()

  return (
    <div className={`leading-tight ${className}`}>
      <div className="text-xs text-muted">Available funds</div>
      {wallet.isPending ? (
        <Skeleton className="mt-1 h-4 w-24" />
      ) : (
        <div
          className="font-mono text-sm tabular-nums"
          title={wallet.isError ? 'Wallet unavailable' : undefined}
        >
          {formatINR(wallet.data?.availableFunds)}
        </div>
      )}
    </div>
  )
}
