/** A grey placeholder block shown while data loads. Decorative: pair it with a role="status" label. */
export function Skeleton({ className = 'h-4 w-full' }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`block animate-pulse rounded bg-border/70 motion-reduce:animate-none ${className}`}
    />
  )
}
