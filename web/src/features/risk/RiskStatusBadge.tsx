import type { RiskStatus } from './api'
import { statusPresentation } from './gauge'

const toneClass = {
  up: 'border-up/40 bg-up/10 text-up',
  warning: 'border-warning/50 bg-warning/15 text-warning',
  down: 'border-down/50 bg-down/15 text-down',
}

/** Status as icon + words in a tinted pill. */
export function RiskStatusBadge({ status }: { status: RiskStatus }) {
  const p = statusPresentation[status] ?? statusPresentation.Normal
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-sm font-semibold ${toneClass[p.tone]}`}
    >
      <span aria-hidden="true" className="font-mono">
        {p.icon}
      </span>
      {p.label}
    </span>
  )
}
