import type { ReactNode } from 'react'
import { errorMessage, isApiError } from '@/api/errors'
import { Alert } from './Alert'
import { Button } from './Button'
import { Skeleton } from './Skeleton'

/**
 * The three states every data view needs, so they look and behave the same everywhere:
 * LoadingState (skeletons + a screen-reader label), EmptyState and ErrorState.
 */

/** A failed load: the server's message, a reference for server faults, and a way to retry. */
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
      <Alert title={title}>
        {errorMessage(error)}
        {isApiError(error) && error.status >= 500 && error.correlationId && (
          <span className="mt-1 block text-xs">
            Reference <code className="font-mono select-all">{error.correlationId}</code>
          </span>
        )}
      </Alert>
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

/**
 * Placeholder while data loads. `rows` suits tables and lists, `cards` summary tiles, `block`
 * a chart or panel. The label is read by screen readers; the skeletons are decorative.
 */
export function LoadingState({
  label,
  variant = 'rows',
  count = 5,
  className = '',
}: {
  label: string
  variant?: 'rows' | 'cards' | 'block'
  count?: number
  className?: string
}) {
  return (
    <div role="status" className={className}>
      <span className="sr-only">{label}…</span>
      {variant === 'rows' && (
        <div className="space-y-3 rounded-lg border border-border bg-surface p-4">
          {Array.from({ length: count }, (_, i) => (
            <Skeleton key={i} className="h-5 w-full" />
          ))}
        </div>
      )}
      {variant === 'cards' && (
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: count }, (_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      )}
      {variant === 'block' && <Skeleton className="h-56 w-full" />}
    </div>
  )
}
