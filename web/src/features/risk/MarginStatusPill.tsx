import { Link } from 'react-router'
import { Skeleton } from '@/components/Skeleton'
import { formatPercent } from '@/lib/format'
import { useMargin, type RiskStatus } from './api'

const styles: Record<RiskStatus, { label: string; className: string }> = {
  Normal: { label: 'Margin OK', className: 'border-up/40 bg-up/10 text-up' },
  MarginCall: { label: 'Margin call', className: 'border-warning/50 bg-warning/15 text-warning' },
  SquareOff: { label: 'Square-off', className: 'border-down/50 bg-down/15 text-down' },
}

/** Margin health at a glance, from GET /api/margin. The label carries the meaning; colour backs it up. */
export function MarginStatusPill() {
  const margin = useMargin()

  if (margin.isPending) return <Skeleton className="h-6 w-20 rounded-full" />

  const base =
    'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap'
  if (margin.isError) {
    return (
      <span className={`${base} border-border text-muted`} title="Margin status unavailable">
        Margin —
      </span>
    )
  }

  const style = styles[margin.data.status] ?? styles.Normal
  return (
    <Link
      to="/risk"
      className={`${base} ${style.className}`}
      title={`Margin utilisation ${formatPercent(margin.data.utilisationPercent)}`}
    >
      <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />
      {style.label}
    </Link>
  )
}
