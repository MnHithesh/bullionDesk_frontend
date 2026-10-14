import type { LedgerEntryType } from './api'

// Small line icons (24px grid). SVG rather than emoji, so they look the same on every system.
const paths: Record<LedgerEntryType, string> = {
  OpeningBalance: 'M12 3l2.6 5.6 6 .6-4.5 4 1.3 6L12 16.3 6.6 19.2l1.3-6-4.5-4 6-.6z',
  MarginBlocked: 'M7 11V8a5 5 0 0 1 10 0v3M5 11h14v10H5z',
  MarginReleased: 'M7 11V8a5 5 0 0 1 9.6-2M5 11h14v10H5z',
  RealisedPnl: 'M7 20V5M3 9l4-4 4 4M17 4v15M13 15l4 4 4-4',
  Charges: 'M6 4h12M6 9h12M6 4c5 0 7 2.5 7 5s-2 5-7 5l8 6',
  Reset: 'M4 12a8 8 0 1 0 2.4-5.7M4 4v4h4',
}

export function LedgerIcon({ type }: { type: LedgerEntryType }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[type] ?? paths.Reset} />
    </svg>
  )
}
