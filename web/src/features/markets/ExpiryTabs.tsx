import { useRef, type KeyboardEvent } from 'react'
import { formatDateIST } from '@/lib/format'

export const ALL_EXPIRIES = 'all'

/**
 * Tabs filtering the market watch by expiry. Arrow keys move between tabs (the WAI-ARIA tabs
 * pattern); the selected value lives in the URL so the view survives a reload and can be shared.
 */
export function ExpiryTabs({
  expiries,
  selected,
  onSelect,
  controls,
}: {
  expiries: string[]
  selected: string
  onSelect: (expiry: string) => void
  controls: string
}) {
  const options = [ALL_EXPIRIES, ...expiries]
  const refs = useRef<(HTMLButtonElement | null)[]>([])

  function onKeyDown(event: KeyboardEvent, index: number) {
    const step = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0
    if (!step) return
    event.preventDefault()
    const next = (index + step + options.length) % options.length
    onSelect(options[next])
    refs.current[next]?.focus()
  }

  return (
    <div role="tablist" aria-label="Expiry" className="flex gap-1 overflow-x-auto pb-1">
      {options.map((option, index) => {
        const isSelected = option === selected
        return (
          <button
            key={option}
            ref={(el) => {
              refs.current[index] = el
            }}
            type="button"
            role="tab"
            aria-selected={isSelected}
            aria-controls={controls}
            tabIndex={isSelected ? 0 : -1}
            onClick={() => onSelect(option)}
            onKeyDown={(e) => onKeyDown(e, index)}
            className={`shrink-0 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              isSelected
                ? 'bg-accent text-accent-contrast'
                : 'text-muted hover:bg-surface hover:text-text'
            }`}
          >
            {option === ALL_EXPIRIES ? 'All expiries' : formatDateIST(option)}
          </button>
        )
      })}
    </div>
  )
}
