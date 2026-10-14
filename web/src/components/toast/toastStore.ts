/**
 * A tiny toast store that lives outside React, so non-component code (the QueryClient's global
 * error handlers) can raise toasts too. Components subscribe with useSyncExternalStore, the same
 * pattern as the token store.
 */

export type ToastTone = 'success' | 'error' | 'info'

export interface Toast {
  id: string
  tone: ToastTone
  title: string
  description?: string
  /** Correlation id from ProblemDetails, shown on server errors so the backend logs can be searched. */
  reference?: string
}

type Listener = () => void

const DURATION: Record<ToastTone, number> = { success: 5_000, info: 5_000, error: 10_000 }

let toasts: Toast[] = []
const listeners = new Set<Listener>()
const timers = new Map<string, ReturnType<typeof setTimeout>>()
let counter = 0

function emit() {
  for (const listener of listeners) listener()
}

function dismiss(id: string) {
  clearTimeout(timers.get(id))
  timers.delete(id)
  const next = toasts.filter((t) => t.id !== id)
  if (next.length !== toasts.length) {
    toasts = next
    emit()
  }
}

/**
 * Shows a toast. Passing an `id` replaces an existing toast with that id instead of stacking a
 * new one, so a failing 1-second poll shows one toast, not one per second.
 */
function show(input: Omit<Toast, 'id'> & { id?: string }): string {
  const id = input.id ?? `toast-${++counter}`
  const toast: Toast = { ...input, id }
  toasts = toasts.some((t) => t.id === id)
    ? toasts.map((t) => (t.id === id ? toast : t))
    : [...toasts, toast].slice(-4)
  clearTimeout(timers.get(id))
  timers.set(
    id,
    setTimeout(() => dismiss(id), DURATION[toast.tone]),
  )
  emit()
  return id
}

export const toast = {
  show,
  success: (title: string, description?: string) => show({ tone: 'success', title, description }),
  info: (title: string, description?: string) => show({ tone: 'info', title, description }),
  error: (title: string, options: { description?: string; reference?: string; id?: string } = {}) =>
    show({ tone: 'error', title, ...options }),
  dismiss,
  /** Test helper: drop every toast and timer. */
  clear() {
    for (const timer of timers.values()) clearTimeout(timer)
    timers.clear()
    toasts = []
    emit()
  },
  subscribe(listener: Listener) {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },
  getSnapshot: () => toasts,
}
