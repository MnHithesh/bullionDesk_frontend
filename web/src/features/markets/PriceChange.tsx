import { direction, formatPercent, formatSignedNumber, type Direction } from '@/lib/format'

const toneClass: Record<Direction, string> = {
  up: 'text-up',
  down: 'text-down',
  flat: 'text-muted',
}

const arrow: Record<Direction, string> = { up: '▲', down: '▼', flat: '' }
const spoken: Record<Direction, string> = { up: 'up', down: 'down', flat: 'unchanged' }

/** A change value with colour, arrow and sign, so the direction never relies on colour alone. */
export function PriceChange({
  value,
  percent,
  as = 'both',
}: {
  value: number | null
  percent: number | null
  as?: 'value' | 'percent' | 'both'
}) {
  const dir = direction(value)
  const amount = formatSignedNumber(value)
  const pct = formatPercent(percent, { signed: true })
  const text = as === 'value' ? amount : as === 'percent' ? pct : `${amount} (${pct})`

  return (
    <span className={`whitespace-nowrap ${toneClass[dir]}`} data-direction={dir}>
      {arrow[dir] && <span aria-hidden="true">{arrow[dir]} </span>}
      <span className="sr-only">{spoken[dir]} </span>
      {text}
    </span>
  )
}
