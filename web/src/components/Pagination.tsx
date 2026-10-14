import { Button } from './Button'

export function Pagination({
  page,
  totalPages,
  totalCount,
  noun,
  onPage,
}: {
  page: number
  totalPages: number
  totalCount: number
  /** Singular and plural, e.g. ['order', 'orders']. */
  noun: [string, string]
  onPage: (page: number) => void
}) {
  return (
    <nav aria-label="Pagination" className="flex items-center justify-between gap-3 text-sm">
      <span className="text-muted">
        Page {page} of {Math.max(1, totalPages)} · {totalCount}{' '}
        {totalCount === 1 ? noun[0] : noun[1]}
      </span>
      <div className="flex gap-2">
        <Button variant="secondary" disabled={page <= 1} onClick={() => onPage(page - 1)}>
          Previous
        </Button>
        <Button variant="secondary" disabled={page >= totalPages} onClick={() => onPage(page + 1)}>
          Next
        </Button>
      </div>
    </nav>
  )
}
