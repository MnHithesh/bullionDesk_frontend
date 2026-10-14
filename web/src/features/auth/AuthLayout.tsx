import type { ReactNode } from 'react'
import { ThemeToggle } from '@/components/ThemeToggle'

export function AuthLayout({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex items-center justify-between px-4 py-3">
        <span className="text-lg font-semibold tracking-tight">
          Bullion<span className="text-accent">Desk</span>
        </span>
        <ThemeToggle />
      </header>
      <main className="flex flex-1 items-start justify-center px-4 py-8 sm:items-center">
        <div className="w-full max-w-sm rounded-lg border border-border bg-surface p-6 shadow-sm">
          <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
          <div className="mt-6">{children}</div>
        </div>
      </main>
    </div>
  )
}
