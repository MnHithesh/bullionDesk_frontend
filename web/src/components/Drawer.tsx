import { createContext, useContext, useEffect, useId, useRef, type ReactNode } from 'react'

/**
 * A side panel built as a compound component:
 *
 *   <Drawer open onClose={…}>
 *     <Drawer.Header>Title</Drawer.Header>
 *     <Drawer.Body>…</Drawer.Body>
 *   </Drawer>
 *
 * The parent owns the behaviour (native <dialog>, focus trap, Escape, backdrop click) and shares
 * what the parts need (onClose, the title id) through context, so callers arrange the parts
 * freely without threading props through them.
 */

interface DrawerContextValue {
  onClose: () => void
  titleId: string
}

const DrawerContext = createContext<DrawerContextValue | null>(null)

function useDrawer() {
  const ctx = useContext(DrawerContext)
  if (!ctx) throw new Error('Drawer.Header and Drawer.Body must be used inside <Drawer>')
  return ctx
}

export function Drawer({
  open,
  onClose,
  children,
}: {
  open: boolean
  onClose: () => void
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
      onClick={(e) => e.target === ref.current && onClose()}
      className="m-0 ml-auto h-dvh max-h-none w-[min(28rem,100vw)] max-w-none border-l border-border bg-surface p-0 text-text backdrop:bg-black/40"
    >
      {open && (
        <DrawerContext.Provider value={{ onClose, titleId }}>
          <div className="flex h-full flex-col">{children}</div>
        </DrawerContext.Provider>
      )}
    </dialog>
  )
}

function DrawerHeader({ children }: { children: ReactNode }) {
  const { onClose, titleId } = useDrawer()
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
      <h2 id={titleId} className="text-lg font-semibold">
        {children}
      </h2>
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="inline-flex size-9 items-center justify-center rounded-md text-muted hover:text-text"
      >
        ✕
      </button>
    </div>
  )
}

function DrawerBody({ children }: { children: ReactNode }) {
  return <div className="flex-1 space-y-5 overflow-y-auto px-4 py-4">{children}</div>
}

// Attach the parts so callers write <Drawer.Header>: they read as pieces of one component.
Drawer.Header = DrawerHeader
Drawer.Body = DrawerBody
