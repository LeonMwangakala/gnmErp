import { useCallback, useEffect, useRef } from 'react'

const DEFAULT_MS = 160

/**
 * Delayed close helper so a pointer can move from the trigger to a portaled dropdown without the menu disappearing.
 */
export function useHoverDropdownDelay(delayMs = DEFAULT_MS) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const cancel = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const schedule = useCallback(
    (fn: () => void) => {
      cancel()
      timerRef.current = setTimeout(fn, delayMs)
    },
    [cancel, delayMs]
  )

  useEffect(() => () => cancel(), [cancel])

  return { cancel, schedule }
}
