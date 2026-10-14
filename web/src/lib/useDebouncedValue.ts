import { useEffect, useState } from 'react'

/**
 * The value, but only after it has stopped changing for `delay` ms. Each change restarts the
 * timer and the cleanup cancels the previous one, which is RxJS's debounceTime(delay) for a value.
 */
export function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])

  return debounced
}
