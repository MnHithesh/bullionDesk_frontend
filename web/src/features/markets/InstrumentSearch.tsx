import { useId, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { useHotkey } from '@/lib/useHotkey'
import { formatDateIST } from '@/lib/format'
import { useInstruments } from './api'

const MAX_RESULTS = 8

/**
 * Instrument search in the top bar, following the ARIA combobox pattern: the input keeps focus,
 * arrow keys move the highlighted option (aria-activedescendant), Enter opens it, Escape closes
 * the list. "/" focuses it from anywhere.
 */
export function InstrumentSearch({ className = '' }: { className?: string }) {
  const instruments = useInstruments()
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)
  const listId = useId()
  const [text, setText] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)

  useHotkey('/', () => {
    inputRef.current?.focus()
    inputRef.current?.select()
  })

  const query = text.trim().toLowerCase()
  const results = (instruments.data ?? [])
    .filter(
      (i) =>
        !query ||
        i.symbol.toLowerCase().includes(query) ||
        i.name.toLowerCase().includes(query) ||
        i.underlying.toLowerCase().includes(query),
    )
    .slice(0, MAX_RESULTS)
  const showList = open && results.length > 0
  const activeIndex = Math.min(active, results.length - 1)

  function choose(symbol: string) {
    setText('')
    setOpen(false)
    inputRef.current?.blur()
    void navigate(`/markets/${encodeURIComponent(symbol)}`)
  }

  return (
    <div className={`relative ${className}`}>
      <label htmlFor={`${listId}-input`} className="sr-only">
        Search contracts
      </label>
      <input
        ref={inputRef}
        id={`${listId}-input`}
        type="search"
        role="combobox"
        autoComplete="off"
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={showList ? `${listId}-${activeIndex}` : undefined}
        aria-keyshortcuts="/"
        placeholder="Search contracts  /"
        value={text}
        onChange={(e) => {
          setText(e.target.value)
          setActive(0)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault()
            setOpen(true)
            setActive((a) => Math.min(a + 1, results.length - 1))
          } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            setActive((a) => Math.max(a - 1, 0))
          } else if (e.key === 'Enter' && showList) {
            e.preventDefault()
            choose(results[activeIndex].symbol)
          } else if (e.key === 'Escape') {
            setOpen(false)
          }
        }}
        className="w-full rounded-md border border-border bg-bg px-3 py-1.5 text-sm placeholder:text-muted"
      />
      {showList && (
        <ul
          id={listId}
          role="listbox"
          aria-label="Contracts"
          className="absolute z-30 mt-1 w-full min-w-64 overflow-hidden rounded-md border border-border bg-surface py-1 shadow-lg"
        >
          {results.map((i, index) => (
            <li
              key={i.symbol}
              id={`${listId}-${index}`}
              role="option"
              aria-selected={index === activeIndex}
              // mousedown, not click: it fires before the input's blur closes the list.
              onMouseDown={(e) => {
                e.preventDefault()
                choose(i.symbol)
              }}
              onMouseEnter={() => setActive(index)}
              className="flex cursor-pointer justify-between gap-3 px-3 py-1.5 text-sm aria-selected:bg-bg"
            >
              <span className="font-medium">{i.symbol}</span>
              <span className="text-muted">{formatDateIST(i.expiryDate)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
