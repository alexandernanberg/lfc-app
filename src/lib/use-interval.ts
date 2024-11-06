import { useEffect, useRef } from 'react'

export function useInterval<T extends () => unknown>(
  callback: T,
  ms: number | null,
) {
  const ref = useRef(callback)

  useEffect(() => {
    ref.current = callback
  })

  useEffect(() => {
    const tick = () => {
      ref.current()
    }

    if (ms !== null) {
      const id = setInterval(tick, ms)
      return () => clearInterval(id)
    }
  }, [ms])
}
