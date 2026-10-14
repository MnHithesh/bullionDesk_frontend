import { useState, useSyncExternalStore } from 'react'
import { toast, type Toast } from './toastStore'

const toneClass = {
  success: 'border-up/40',
  info: 'border-border',
  error: 'border-down/50',
}

const toneIcon = { success: '✓', info: 'i', error: '!' }
const iconClass = {
  success: 'bg-up text-up-contrast',
  info: 'bg-border text-text',
  error: 'bg-down text-down-contrast',
}

/**
 * Renders the toast stack. Success and info toasts are polite status messages; errors are alerts,
 * so screen readers announce them straight away. Each has a visible close button.
 */
export function Toaster() {
  const toasts = useSyncExternalStore(toast.subscribe, toast.getSnapshot, toast.getSnapshot)

  return (
    <section
      aria-label="Notifications"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex flex-col items-center gap-2 p-4 sm:items-end"
    >
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} />
      ))}
    </section>
  )
}

function ToastItem({ toast: t }: { toast: Toast }) {
  const [copied, setCopied] = useState(false)

  return (
    <div
      role={t.tone === 'error' ? 'alert' : 'status'}
      className={`pointer-events-auto flex w-full max-w-sm gap-3 rounded-lg border bg-surface p-3 text-sm shadow-lg ${toneClass[t.tone]}`}
    >
      <span
        aria-hidden="true"
        className={`mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full text-xs font-bold ${iconClass[t.tone]}`}
      >
        {toneIcon[t.tone]}
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-medium">{t.title}</p>
        {t.description && <p className="mt-0.5 text-muted">{t.description}</p>}
        {t.reference && (
          <p className="mt-1 text-xs text-muted">
            Reference <code className="font-mono text-text select-all">{t.reference}</code>{' '}
            <button
              type="button"
              className="underline underline-offset-2"
              onClick={() => {
                void navigator.clipboard?.writeText(t.reference!).then(() => setCopied(true))
              }}
            >
              {copied ? 'Copied' : 'Copy'}
            </button>
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={() => toast.dismiss(t.id)}
        aria-label="Dismiss notification"
        className="-m-1 inline-flex size-7 shrink-0 items-center justify-center rounded text-muted hover:text-text"
      >
        ✕
      </button>
    </div>
  )
}
