import { Link, useNavigate } from 'react-router'
import { formatDateIST, formatNumber } from '@/lib/format'
import type { Instrument, Quote } from './api'
import { FlashPrice } from './FlashPrice'
import { PriceChange } from './PriceChange'

const cell = 'px-2 py-2.5 text-right font-mono tabular-nums sm:px-3'

/** One contract in the market watch. The whole row opens the detail view; the name is the real link. */
export function QuoteRow({
  instrument,
  quote,
}: {
  instrument: Instrument
  quote: Quote | undefined
}) {
  const navigate = useNavigate()
  const href = `/markets/${encodeURIComponent(instrument.symbol)}`

  return (
    <tr
      onClick={() => void navigate(href)}
      className="cursor-pointer border-t border-border transition-colors hover:bg-bg"
    >
      <th scope="row" className="px-2 py-2.5 text-left font-normal sm:px-3">
        <Link
          to={href}
          className="font-medium hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          {instrument.symbol}
        </Link>
        <span className="block text-xs text-muted">
          {instrument.type} · {formatDateIST(instrument.expiryDate)}
        </span>
      </th>
      <td className={cell}>
        <FlashPrice value={quote?.lastPrice ?? null} />
      </td>
      <td className={`${cell} hidden sm:table-cell`}>
        <PriceChange value={quote?.change ?? null} percent={null} as="value" />
      </td>
      <td className={cell}>
        <PriceChange
          value={quote?.change ?? null}
          percent={quote?.changePercent ?? null}
          as="percent"
        />
      </td>
      <td className={`${cell} hidden md:table-cell`}>{formatNumber(quote?.high)}</td>
      <td className={`${cell} hidden md:table-cell`}>{formatNumber(quote?.low)}</td>
    </tr>
  )
}
