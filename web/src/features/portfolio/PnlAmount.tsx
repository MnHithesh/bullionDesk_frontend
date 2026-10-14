import { direction, formatSignedINR, type Direction } from '@/lib/format'

const tone: Record<Direction, string> = { up: 'text-up', down: 'text-down', flat: 'text-muted' }
const arrow: Record<Direction, string> = { up: '▲', down: '▼', flat: '' }
const spoken: Record<Direction, string> = { up: 'profit', down: 'loss', flat: 'flat' }

/** A profit or loss: green ▲ +₹… or red ▼ -₹…, so it never relies on colour alone. */
export function PnlAmount({ value, className = '' }: { value: number | null; className?: string }) {
  const dir = direction(value)
  return (
    <span
      className={`font-mono whitespace-nowrap tabular-nums ${tone[dir]} ${className}`}
      data-direction={dir}
    >
      {arrow[dir] && <span aria-hidden="true">{arrow[dir]} </span>}
      <span className="sr-only">{spoken[dir]} </span>
      {formatSignedINR(value)}
    </span>
  )
}
