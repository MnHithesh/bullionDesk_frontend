import { useEffect, useId, useRef, type ReactNode } from 'react'

/**
 * A modal dialog on the native <dialog> element: showModal() traps focus, makes the page behind
 * it inert and closes on Escape. Children render only while open, so a closed dialog's form
 * state is thrown away and starts fresh next time.
 */
export function Dialog({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      className="m-auto w-[min(28rem,calc(100vw-2rem))] rounded-lg border border-border bg-surface p-0 text-text shadow-xl backdrop:bg-black/40"
    >
      {open && (
        <div className="p-5">
          <h2 id={titleId} className="text-lg font-semibold">
            {title}
          </h2>
          <div className="mt-4">{children}</div>
        </div>
      )}
    </dialog>
  )
}
