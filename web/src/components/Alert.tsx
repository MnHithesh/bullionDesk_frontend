import type { ReactNode } from 'react'

/** A form- or page-level error. role="alert" makes screen readers announce it when it appears. */
export function Alert({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <div
      role="alert"
      className="rounded-md border border-down/40 bg-down/10 px-4 py-3 text-sm text-down"
    >
      {title && <p className="font-medium">{title}</p>}
      <div className={title ? 'mt-1' : undefined}>{children}</div>
    </div>
  )
}
