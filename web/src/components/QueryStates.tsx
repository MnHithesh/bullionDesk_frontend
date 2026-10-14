import type { ReactNode } from 'react'
import { errorMessage } from '@/api/errors'
import { Alert } from './Alert'
import { Button } from './Button'

/** A failed load, with the server's message and a way to try again. */
export function ErrorState({
  title,
  error,
  onRetry,
}: {
  title: string
  error: unknown
  onRetry?: () => void
}) {
  return (
    <div className="space-y-3">
      <Alert title={title}>{errorMessage(error)}</Alert>
      {onRetry && (
        <Button variant="secondary" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  )
}

/** A successful load that returned nothing. */
export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-border px-4 py-10 text-center">
      <p className="font-medium">{title}</p>
      {children && <div className="mt-1 text-sm text-muted">{children}</div>}
    </div>
  )
}
