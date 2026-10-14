import { useState } from 'react'
import { formatNumber } from '@/lib/format'

type Flash = { dir: 'up' | 'down'; n: number }

const flashClass = {
  up: 'motion-safe:animate-flash-up',
  down: 'motion-safe:animate-flash-down',
}

/**
 * A price that briefly tints green or red when it changes. The previous value is kept in state
 * and compared during render (React's pattern for "derive from the last render"), and the
 * counter in `key` remounts the span so the CSS animation restarts on every change.
 * motion-safe: means users with prefers-reduced-motion see no flash at all.
 */
export function FlashPrice({ value }: { value: number | null }) {
  const [previous, setPrevious] = useState(value)
  const [flash, setFlash] = useState<Flash | null>(null)

  if (value !== previous) {
    setPrevious(value)
    if (value !== null && previous !== null) {
      setFlash((f) => ({ dir: value > previous ? 'up' : 'down', n: (f?.n ?? 0) + 1 }))
    }
  }

  return (
    <span
      key={flash?.n ?? 0}
      data-flash={flash?.dir}
      className={`-mx-1 rounded px-1 ${flash ? flashClass[flash.dir] : ''}`}
    >
      {formatNumber(value)}
    </span>
  )
}
