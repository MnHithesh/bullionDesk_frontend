export function Spinner({ className = 'size-6' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`animate-spin motion-reduce:animate-none ${className}`}
      fill="none"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="4" />
      <path
        d="M22 12a10 10 0 0 0-10-10"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
      />
    </svg>
  )
}

export function FullPageSpinner({ label }: { label: string }) {
  return (
    <div role="status" className="flex min-h-dvh items-center justify-center gap-3 text-muted">
      <Spinner />
      <span>{label}…</span>
    </div>
  )
}
