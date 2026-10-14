import { Link, useLocation } from 'react-router'
import { useMargin } from './api'
import { statusPresentation } from './gauge'

/**
 * App-wide warning while the account is in a margin call or being squared off. It reads the
 * shared margin query (the top bar already polls it), so no global store is needed: the server
 * state is the single source of truth and every component reading it agrees.
 */
export function MarginBanner() {
  const margin = useMargin()
  const { pathname } = useLocation()
  const status = margin.data?.status
  if (status !== 'MarginCall' && status !== 'SquareOff') return null

  const p = statusPresentation[status]
  const severe = status === 'SquareOff'
  return (
    <div
      role="alert"
      className={`border-b px-4 py-2.5 text-sm ${
        severe
          ? 'border-down/50 bg-down/15 text-down'
          : 'border-warning/50 bg-warning/15 text-warning'
      }`}
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="font-semibold">
          <span aria-hidden="true" className="font-mono">
            {p.icon}{' '}
          </span>
          {p.label}
        </span>
        <span className="text-text">{p.summary}</span>
        {pathname !== '/risk' && (
          <Link to="/risk" className="font-medium underline underline-offset-4">
            View risk
          </Link>
        )}
      </div>
    </div>
  )
}
