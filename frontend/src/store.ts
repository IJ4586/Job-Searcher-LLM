import { useCallback, useMemo, useState } from 'react'

/** A draft document with a saved copy, so edits survive switching pages
 *  and we can tell when there are unsaved changes. */
export type Doc<T> = {
  data: T
  dirty: boolean
  saving: boolean
  set: (update: T | ((d: T) => T)) => void
  save: () => Promise<T>
  reset: (value: T) => void
}

export function useDoc<T>(initial: T, saver: (value: T) => Promise<T>): Doc<T> {
  const [data, setData] = useState<T>(initial)
  const [saved, setSaved] = useState<string>(() => JSON.stringify(initial))
  const [saving, setSaving] = useState(false)

  const set = useCallback((u: T | ((d: T) => T)) => {
    setData((d) => (typeof u === 'function' ? (u as (d: T) => T)(d) : u))
  }, [])

  const reset = useCallback((value: T) => {
    setData(value)
    setSaved(JSON.stringify(value))
  }, [])

  const save = useCallback(async () => {
    setSaving(true)
    try {
      const out = await saver(data)
      setData(out)
      setSaved(JSON.stringify(out))
      return out
    } finally {
      setSaving(false)
    }
  }, [saver, data])

  const dirty = useMemo(() => JSON.stringify(data) !== saved, [data, saved])
  return { data, dirty, saving, set, save, reset }
}
