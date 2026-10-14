import { Suspense, useEffect, useRef, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router'
import { LoadingState } from '@/components/QueryStates'
import { ThemeToggle } from '@/components/ThemeToggle'
import { InstrumentSearch } from '@/features/markets/InstrumentSearch'
import { MarginBanner } from '@/features/risk/MarginBanner'
import { MarginStatusPill } from '@/features/risk/MarginStatusPill'
import { AvailableFunds } from '@/features/wallet/AvailableFunds'
import { navItems } from './nav'
import { UserMenu } from './UserMenu'

/**
 * Signed-in layout: top bar, side navigation (a drawer below the lg breakpoint) and the page in
 * <Outlet />. Like an Angular shell component with <router-outlet>, used as a layout route.
 */
export function AppShell() {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const location = useLocation()

  // Close the drawer after navigating. Comparing with the previous path during render avoids an
  // effect that would first paint the open drawer on the new page.
  const [path, setPath] = useState(location.pathname)
  if (path !== location.pathname) {
    setPath(location.pathname)
    setDrawerOpen(false)
  }

  return (
    <div className="min-h-dvh">
      <a
        href="#main"
        className="sr-only z-50 rounded bg-surface px-3 py-2 focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      >
        Skip to content
      </a>

      <header className="sticky top-0 z-20 border-b border-border bg-surface">
        <div className="flex items-center gap-2 px-3 py-2 sm:gap-3 sm:px-4">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label="Open navigation"
            className="inline-flex size-9 items-center justify-center rounded-md text-muted hover:text-text lg:hidden"
          >
            <MenuIcon />
          </button>
          <span className="text-lg font-semibold tracking-tight">
            Bullion<span className="text-accent">Desk</span>
          </span>
          <InstrumentSearch className="ml-4 hidden w-56 md:block lg:w-64" />
          <div className="ml-auto flex items-center gap-2 sm:gap-4">
            <AvailableFunds className="hidden text-right sm:block" />
            <MarginStatusPill />
            <ThemeToggle />
            <UserMenu />
          </div>
        </div>
      </header>

      {/* Outside the sticky header so the side nav's sticky offset stays the header height. */}
      <MarginBanner />

      <div className="flex">
        <aside className="sticky top-[53px] hidden h-[calc(100dvh-53px)] w-52 shrink-0 border-r border-border bg-surface lg:block">
          <SideNav />
        </aside>
        <main id="main" className="min-w-0 flex-1 px-4 py-6 lg:px-8">
          {/* Lazy pages suspend here while their chunk loads; the shell stays on screen. */}
          <Suspense fallback={<LoadingState label="Loading page" variant="block" />}>
            <Outlet />
          </Suspense>
        </main>
      </div>

      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </div>
  )
}

function SideNav() {
  return (
    <nav aria-label="Main" className="p-3">
      <ul className="space-y-1">
        {navItems.map((item) => (
          <li key={item.to}>
            <NavLink
              to={item.to}
              className={({ isActive }) =>
                `block rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  isActive ? 'bg-accent/15 text-text' : 'text-muted hover:bg-bg hover:text-text'
                }`
              }
            >
              {item.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}

/**
 * Mobile navigation in a native <dialog>. showModal() gives focus trapping, Escape to close and
 * an inert page behind it for free; the effect keeps the element in step with `open`.
 */
function Drawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog || typeof dialog.showModal !== 'function') return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      aria-label="Navigation"
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      className="m-0 h-dvh max-h-none w-72 max-w-[85vw] border-r border-border bg-surface p-0 text-text backdrop:bg-black/40 lg:hidden"
    >
      {/* Content only while open: a closed drawer keeps nothing (duplicate links, polls) in the page. */}
      {open && (
        <>
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <span className="font-semibold">Menu</span>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close navigation"
              className="inline-flex size-9 items-center justify-center rounded-md text-muted hover:text-text"
            >
              ✕
            </button>
          </div>
          <AvailableFunds className="border-b border-border px-4 py-3" />
          <SideNav />
        </>
      )}
    </dialog>
  )
}

function MenuIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <path d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  )
}
