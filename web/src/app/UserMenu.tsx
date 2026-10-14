import { useEffect, useId, useRef, useState } from 'react'
import { useAuth } from '@/features/auth/AuthContext'

/** Avatar button with a small menu: who is signed in, and log out. Closes on Escape or outside click. */
export function UserMenu() {
  const { user, logout } = useAuth()
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const menuId = useId()

  // Listeners exist only while the menu is open; the cleanup removes them when it closes or unmounts.
  useEffect(() => {
    if (!open) return
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false)
        buttonRef.current?.focus()
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  const name = user?.displayName ?? ''

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={`Account menu for ${name}`}
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-2 rounded-md py-1 pr-2 pl-1 hover:bg-bg"
      >
        <span
          aria-hidden="true"
          className="inline-flex size-7 items-center justify-center rounded-full bg-accent text-sm font-semibold text-accent-contrast"
        >
          {name.charAt(0).toUpperCase()}
        </span>
        <span className="hidden max-w-32 truncate text-sm lg:inline">{name}</span>
      </button>

      {open && (
        <div
          id={menuId}
          role="menu"
          aria-label="Account"
          className="absolute right-0 z-30 mt-2 w-56 rounded-md border border-border bg-surface py-1 shadow-lg"
        >
          <div className="border-b border-border px-3 py-2 text-sm">
            <p className="truncate font-medium">{name}</p>
            <p className="truncate text-muted">{user?.email}</p>
          </div>
          <button
            type="button"
            role="menuitem"
            autoFocus
            onClick={() => void logout()}
            className="block w-full px-3 py-2 text-left text-sm hover:bg-bg"
          >
            Log out
          </button>
        </div>
      )}
    </div>
  )
}
