import { useCallback, useEffect, useState } from 'react'
import { api, type Experience, type Health, type Job, type Preferences, type Run, type Settings } from './api'
import { useDoc } from './store'
import { btn, cx } from './styles'
import { Dot, Spinner } from './ui'
import { defaultPreferences, defaultSettings, emptyExperience } from './defaults'
import ExperiencePage from './pages/ExperiencePage'
import PreferencesPage from './pages/PreferencesPage'
import PostingsPage from './pages/PostingsPage'
import SettingsPage from './pages/SettingsPage'

export type Route = 'experience' | 'preferences' | 'postings' | 'settings'
export type Notify = (msg: string, action?: { label: string; run: () => void }) => void

const ROUTES: { id: Route; num: string; label: string }[] = [
  { id: 'experience', num: '01', label: 'Experience' },
  { id: 'preferences', num: '02', label: 'Job preferences' },
  { id: 'postings', num: '03', label: 'Job postings' },
  { id: 'settings', num: '04', label: 'Settings and LLM' },
]

const readRoute = (): Route | null => {
  const r = window.location.hash.replace(/^#\/?/, '')
  return ROUTES.some((x) => x.id === r) ? (r as Route) : null
}

export default function App() {
  const exp = useDoc<Experience>(emptyExperience(), api.saveExperience)
  const prefs = useDoc<Preferences>(defaultPreferences(), api.savePreferences)
  const settings = useDoc<Settings>(defaultSettings(), api.saveSettings)
  const [jobs, setJobs] = useState<Job[]>([])
  const [lastRun, setLastRun] = useState<Run | null>(null)
  const [health, setHealth] = useState<Health | null>(null)
  const [route, setRoute] = useState<Route>(readRoute() ?? 'experience')
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading')
  const [loadError, setLoadError] = useState('')
  const [searching, setSearching] = useState(false)
  const [toast, setToast] = useState<{ msg: string; action?: { label: string; run: () => void } } | null>(null)

  const notify: Notify = useCallback((msg, action) => setToast({ msg, action }), [])
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), toast.action ? 8000 : 5000)
    return () => clearTimeout(t)
  }, [toast])

  const go = useCallback((r: Route) => {
    if (window.location.hash !== `#/${r}`) window.location.hash = `#/${r}`
    setRoute(r)
    window.scrollTo({ top: 0 })
  }, [])

  useEffect(() => {
    const onHash = () => { const r = readRoute(); if (r) { setRoute(r); window.scrollTo({ top: 0 }) } }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  const refreshHealth = useCallback(async () => {
    try { setHealth(await api.health()) } catch { setHealth(null) }
  }, [])

  const { reset: resetExp } = exp
  const { reset: resetPrefs } = prefs
  const { reset: resetSettings } = settings
  const load = useCallback(() =>
    Promise.all([api.experience(), api.preferences(), api.settings(), api.jobs(), api.lastRun()]).then(
      ([e, p, s, j, r]) => {
        resetExp(e); resetPrefs(p); resetSettings(s); setJobs(j); setLastRun(r)
        if (!readRoute()) go(j.length ? 'postings' : 'experience')
        setState('ready')
        refreshHealth()
      },
      (err: Error) => {
        setLoadError(err.message)
        setState('error')
      },
    ), [resetExp, resetPrefs, resetSettings, go, refreshHealth])

  useEffect(() => { load() }, [load])
  useEffect(() => {
    const onFocus = () => { if (state === 'ready') refreshHealth() }
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [state, refreshHealth])

  const anyDirty = exp.dirty || prefs.dirty || settings.dirty
  useEffect(() => {
    if (!anyDirty) return
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault() }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [anyDirty])

  const reloadJobs = useCallback(async () => {
    const [j, r] = await Promise.all([api.jobs(), api.lastRun()])
    setJobs(j); setLastRun(r)
  }, [])

  const runSearch = useCallback(async () => {
    try {
      if (prefs.dirty) await prefs.save()
      if (exp.dirty) await exp.save()
      if (settings.dirty) await settings.save()
    } catch (err) {
      notify('Could not save before searching: ' + (err as Error).message)
      return
    }
    go('postings')
    setSearching(true)
    try {
      const r = await api.search()
      await reloadJobs()
      notify(r.read === 0 ? r.message : `Read ${r.read} postings. ${r.strong} strong ${r.strong === 1 ? 'match' : 'matches'}.`)
    } catch (err) {
      notify('Search failed: ' + (err as Error).message)
    } finally {
      setSearching(false)
    }
  }, [prefs, exp, settings, go, reloadJobs, notify])

  const status = !health ? { tone: 'bad' as const, text: 'Checking model…', short: 'Checking' }
    : health.ai ? { tone: 'ok' as const, text: 'Local model ready', short: 'Ready' }
    : health.reachable ? { tone: 'warn' as const, text: 'Model not installed', short: 'No model' }
    : { tone: 'bad' as const, text: 'Ollama offline', short: 'Offline' }
  const dirtyOf: Record<Route, boolean> = { experience: exp.dirty, preferences: prefs.dirty, postings: false, settings: settings.dirty }

  return (
    <div className="min-h-screen bg-ground text-ink">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:bg-white focus:p-3">Skip to content</a>
      <div className="mx-auto box-border max-w-[80rem] px-4 pt-6 sm:px-6">
        <header className="flex flex-wrap items-start gap-x-8 gap-y-5">
          <a href="#/experience" aria-label="CareerCue, go to Experience" className="block leading-none">
            <img src="/careercue-logo.png" alt="CareerCue" width={1318} height={257} className="block h-9 w-auto max-w-full sm:h-[52px]" />
          </a>
          <nav aria-label="Primary" className="order-3 flex max-w-[47.5rem] flex-[1_1_28rem] flex-wrap gap-x-3 sm:gap-x-5 lg:order-2">
            {ROUTES.map((r) => {
              const active = route === r.id
              return (
                <a key={r.id} href={`#/${r.id}`} aria-current={active ? 'page' : undefined}
                  className={cx('flex flex-[1_1_9.5rem] items-baseline gap-2 border-t-2 border-ink px-2.5 py-2.5 font-display text-[15px] font-semibold text-ink no-underline',
                    active ? 'bg-accent' : 'hover:bg-white')}>
                  <span className="text-xs">{r.num}</span>
                  <span>{r.label}</span>
                  {dirtyOf[r.id] && <span className="ml-auto self-center"><span className="sr-only">(unsaved changes)</span><span aria-hidden="true" className="block size-2 bg-ink" /></span>}
                </a>
              )
            })}
          </nav>
          <a href="#/settings" className="order-2 ml-auto flex min-h-11 items-center gap-2.5 border-2 border-ink bg-white px-3 py-2 font-display text-[13px] font-semibold uppercase tracking-[0.05em] text-ink no-underline sm:px-3.5 lg:order-3 lg:ml-0">
            <Dot tone={status.tone} />
            <span className="sm:hidden" aria-hidden="true">{status.short}</span>
            <span className="max-sm:sr-only">{status.text}</span>
          </a>
        </header>
        <div className="mt-7 h-2.5 bg-ink" />

        <div id="main" tabIndex={-1} className="outline-none">
          {state === 'loading' && (
            <p className="flex items-center gap-3 py-24 font-display text-xl font-semibold"><Spinner />Loading your data…</p>
          )}
          {state === 'error' && (
            <div className="my-12 max-w-[40rem] border-2 border-ink bg-white p-6 shadow-hard">
              <h1 className="m-0 font-display text-2xl font-bold">Can't reach the CareerCue server</h1>
              <p className="mt-2 text-body">{loadError}</p>
              <p className="text-body">Start it from the <code className="bg-panel px-1">backend</code> folder with <code className="bg-panel px-1">uvicorn main:app --reload</code>, then try again.</p>
              <button type="button" className={btn.primary} onClick={() => { setState('loading'); load() }}>Try again</button>
            </div>
          )}
          {state === 'ready' && (
            <>
              {route === 'experience' && <ExperiencePage doc={exp} notify={notify} go={go} health={health} />}
              {route === 'preferences' && <PreferencesPage doc={prefs} notify={notify} go={go} runSearch={runSearch} searching={searching} />}
              {route === 'postings' && <PostingsPage jobs={jobs} setJobs={setJobs} lastRun={lastRun} minScore={settings.data.min_score} searching={searching} runSearch={runSearch} hasTitles={prefs.data.titles.length > 0} notify={notify} go={go} />}
              {route === 'settings' && <SettingsPage doc={settings} health={health} refreshHealth={refreshHealth} notify={notify} reloadAll={load} reloadJobs={reloadJobs} />}
            </>
          )}
        </div>

        <footer className="flex flex-wrap gap-x-8 gap-y-2 border-t-[10px] border-ink pt-5 pb-10 text-sm text-body">
          <span>CareerCue runs on your computer. No account, no cloud.</span>
          <span>Your data lives in one local database file.</span>
        </footer>
      </div>

      {toast && (
        <div role="status" aria-live="polite"
          className="fixed inset-x-4 bottom-4 z-40 flex items-center gap-4 border-2 border-ink bg-ink p-4 text-white shadow-[6px_6px_0_0_#00c9ff] sm:left-auto sm:right-6 sm:max-w-md">
          <span className="min-w-0 flex-1">{toast.msg}</span>
          {toast.action && (
            <button type="button" className="min-h-10 cursor-pointer border-2 border-white bg-accent px-3 font-display text-sm font-bold text-ink"
              onClick={() => { toast.action?.run(); setToast(null) }}>{toast.action.label}</button>
          )}
          <button type="button" aria-label="Dismiss" onClick={() => setToast(null)} className="size-10 flex-none cursor-pointer border-0 bg-transparent font-display text-xl text-white">×</button>
        </div>
      )}
    </div>
  )
}
