import { useCallback, useEffect, useState } from 'react'

/**
 * Loads data for a page and reloads when `deps` change (e.g. the hospital being viewed).
 * Returns { data, error, loading, reload, setData }.
 */
export function useApi(loader, deps) {
  const [state, setState] = useState({ data: null, error: '', loading: true })
  const [tick, setTick] = useState(0)

  useEffect(() => {
    let alive = true
    Promise.resolve()
      .then(() => {
        if (alive) setState((s) => ({ ...s, loading: true }))
        return loader()
      })
      .then((data) => alive && setState({ data, error: '', loading: false }))
      .catch((err) => alive && setState({ data: null, error: err.message || 'Something went wrong', loading: false }))
    return () => {
      alive = false
    }
    // The caller lists what the loader depends on.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick])

  const reload = useCallback(() => setTick((t) => t + 1), [])
  const setData = useCallback((fn) => setState((s) => ({ ...s, data: typeof fn === 'function' ? fn(s.data) : fn })), [])
  return { ...state, reload, setData }
}
