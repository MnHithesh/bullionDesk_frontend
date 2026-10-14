import { useEffect, useRef } from 'react'

/** True when a key press belongs to a text field (typing "b" in a form must not trigger "buy"). */
function isEditable(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false
  if (target.isContentEditable) return true
  const tag = target.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT'
}

/**
 * Single-key shortcut on the whole document, active while the component is mounted (and
 * `enabled`). Ignored while typing in a field, with Ctrl/Alt/Meta held (browser shortcuts), or
 * when something else already handled the key.
 */
export function useHotkey(key: string, handler: (event: KeyboardEvent) => void, enabled = true) {
  // Keep the latest handler without re-subscribing on every render.
  const handlerRef = useRef(handler)
  useEffect(() => {
    handlerRef.current = handler
  })

  useEffect(() => {
    if (!enabled) return
    function onKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) return
      if (isEditable(event.target)) return
      if (event.key.toLowerCase() !== key.toLowerCase()) return
      event.preventDefault()
      handlerRef.current(event)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [key, enabled])
}
