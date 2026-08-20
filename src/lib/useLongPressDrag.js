import { useCallback, useEffect, useRef, useState } from 'react'

const LONG_PRESS_MS = 420
const MOVE_TOLERANCE = 10

/**
 * Touch drag-and-drop via Pointer Events. HTML5 drag events never fire on
 * touch, so phones need this path; mouse keeps using native DnD.
 *
 * Press and hold a source, then slide onto a drop zone. Moving before the
 * hold completes is treated as a scroll and cancels the drag.
 */
export default function useLongPressDrag({ onDrop, zoneSelector }) {
  const [pending, setPending] = useState(null)
  const [drag, setDrag] = useState(null)
  const [target, setTarget] = useState(null)

  const timerRef = useRef(null)
  const dragRef = useRef(null)
  const targetRef = useRef(null)
  const suppressClickRef = useRef(false)

  dragRef.current = drag
  targetRef.current = target

  const clearTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }

  const reset = useCallback(() => {
    clearTimer()
    setPending(null)
    setDrag(null)
    setTarget(null)
  }, [])

  const start = useCallback(
    (id) => (event) => {
      // Mouse users get the richer native HTML5 drag instead.
      if (event.pointerType === 'mouse') return

      const origin = { id, x: event.clientX, y: event.clientY }
      clearTimer()
      setPending(origin)
      timerRef.current = setTimeout(() => {
        timerRef.current = null
        setPending(null)
        setDrag(origin)
        navigator.vibrate?.(25)
      }, LONG_PRESS_MS)
    },
    [],
  )

  const active = Boolean(drag)

  useEffect(() => {
    if (!pending && !active) return

    const onMove = (event) => {
      if (dragRef.current) {
        // Stop the page scrolling out from under the drag.
        event.preventDefault()
        const { clientX: x, clientY: y } = event
        setDrag((current) => (current ? { ...current, x, y } : current))

        const zone = document.elementFromPoint(x, y)?.closest?.(zoneSelector)
        setTarget(zone && !zone.disabled ? zone.dataset.dropKey ?? null : null)
        return
      }

      if (pending) {
        const moved = Math.hypot(event.clientX - pending.x, event.clientY - pending.y)
        if (moved > MOVE_TOLERANCE) {
          clearTimer()
          setPending(null)
        }
      }
    }

    const onUp = () => {
      const current = dragRef.current
      const key = targetRef.current
      if (current) {
        // The press ends in a click event we do not want to act on.
        suppressClickRef.current = true
        if (key !== null) onDrop(current.id, key)
      }
      reset()
    }

    window.addEventListener('pointermove', onMove, { passive: false })
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
    }
  }, [pending, active, onDrop, reset, zoneSelector])

  useEffect(() => clearTimer, [])

  /** True once per drag, so the trailing click does not also toggle the item. */
  const consumeClickSuppression = useCallback(() => {
    if (!suppressClickRef.current) return false
    suppressClickRef.current = false
    return true
  }, [])

  return { dragging: drag, target, start, consumeClickSuppression }
}
