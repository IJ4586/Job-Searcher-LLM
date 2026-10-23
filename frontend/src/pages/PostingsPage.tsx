import { useMemo, useState } from 'react'
import { api, type Job, type Run } from '../api'
import type { Notify, Route } from '../App'
import { btn, cx, labelText, panel } from '../styles'
import { ChipGroup, Field, PageHero, Select, Spinner } from '../ui'

const SORTS = ['Best match', 'Newest', 'Highest pay', 'Company A to Z'] as const
type Sort = (typeof SORTS)[number]
const WITHIN: Record<string, number> = { 'Any time': Infinity, 'Last 24 hours': 1, 'Last 3 days': 3, 'Last 7 days': 7, 'Last 30 days': 30 }
const PAGE = 20

const dayOf = (j: Job) => j.posted_at || (j.created_at || '').slice(0, 10)
const daysAgo = (iso: string) => {
  const t = Date.parse(iso + 'T12:00:00')
  return Number.isNaN(t) ? Infinity : Math.max(0, Math.floor((Date.now() - t) / 864e5))
}
const ago = (iso: string) => {
  const d = daysAgo(iso)
  return d === Infinity ? '' : d === 0 ? 'today' : d === 1 ? '1 day ago' : `${d} days ago`
}
const when = (ts: string) => {
  const d = new Date(ts.replace(' ', 'T') + 'Z')
  return Number.isNaN(+d) ? ts : d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

export default function PostingsPage({ jobs, setJobs, lastRun, minScore, searching, runSearch, hasTitles, notify, go }: {
  jobs: Job[]
  setJobs: (fn: (j: Job[]) => Job[]) => void
  lastRun: Run | null
  minScore: number
  searching: boolean
  runSearch: () => void
  hasTitles: boolean
  notify: Notify
  go: (r: Route) => void
}) {
  const [sort, setSort] = useState<Sort>('Best match')
  const [setting, setSetting] = useState('All')
  const [type, setType] = useState('All')
  const [min, setMin] = useState(minScore)
  const [within, setWithin] = useState('Any time')
  const [savedOnly, setSavedOnly] = useState(false)
  const [limit, setLimit] = useState(PAGE)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const active = [setting !== 'All', type !== 'All', min !== minScore, within !== 'Any time', savedOnly].filter(Boolean).length

  const types = useMemo(() => ['All', ...Array.from(new Set(jobs.map((j) => j.employment_type).filter((x): x is string => !!x))).sort()], [jobs])
  const reset = () => { setSort('Best match'); setSetting('All'); setType('All'); setMin(minScore); setWithin('Any time'); setSavedOnly(false); setLimit(PAGE) }

  const list = useMemo(() => {
    const maxDays = WITHIN[within]
    const out = jobs.filter((j) =>
      (setting === 'All' || j.work_setting === setting)
      && (type === 'All' || j.employment_type === type)
      && j.match_score >= min
      && daysAgo(dayOf(j)) <= maxDays
      && (!savedOnly || j.status === 'saved'))
    const by: Record<Sort, (a: Job, b: Job) => number> = {
      'Best match': (a, b) => b.match_score - a.match_score || b.id - a.id,
      'Newest': (a, b) => dayOf(b).localeCompare(dayOf(a)) || b.match_score - a.match_score,
      'Highest pay': (a, b) => (b.pay_value ?? -1) - (a.pay_value ?? -1) || b.match_score - a.match_score,
      'Company A to Z': (a, b) => (a.company || '~').localeCompare(b.company || '~'),
    }
    return out.sort(by[sort])
  }, [jobs, setting, type, min, within, savedOnly, sort])

  const update = (j: Job) => setJobs((all) => all.map((x) => (x.id === j.id ? j : x)))

  const toggleSave = async (j: Job) => {
    try { update(await api.setJobStatus(j.id, j.status === 'saved' ? 'new' : 'saved')) } catch (err) { notify((err as Error).message) }
  }
  const hide = async (j: Job) => {
    setJobs((all) => all.filter((x) => x.id !== j.id))
    try {
      await api.setJobStatus(j.id, 'hidden')
      notify(`Hid “${j.title}”.`, {
        label: 'Undo',
        run: async () => {
          const back = await api.setJobStatus(j.id, j.status === 'hidden' ? 'new' : j.status)
          setJobs((all) => [...all, back])
        },
      })
    } catch (err) {
      setJobs((all) => [...all, j])
      notify((err as Error).message)
    }
  }

  return (
    <>
      <PageHero step={3} title="Job postings" tag="Your matches"
        intro="Postings your local model scored against your experience and preferences. Every score comes with the reason behind it." />

      <div className="mt-8 flex flex-wrap items-center justify-between gap-x-8 gap-y-4 border-2 border-ink bg-ink px-5 py-5 text-white sm:px-6" aria-live="polite">
        <div className="min-w-0">
          {searching ? (
            <>
              <div className="flex items-center gap-3 font-display text-xl font-bold"><Spinner light />Searching and scoring…</div>
              <div className="text-sm text-[#e6e6e6]">This can take a few minutes on a laptop. You can keep using the app.</div>
            </>
          ) : lastRun ? (
            <>
              <div className="font-display text-xl font-bold">
                Last search: {lastRun.read} postings read, {lastRun.strong} strong {lastRun.strong === 1 ? 'match' : 'matches'}
              </div>
              <div className="text-sm text-[#e6e6e6]">
                {when(lastRun.started_at)}.{' '}
                {lastRun.scored_by === 'keywords' ? 'The model was not available, so scores are keyword-only.'
                  : lastRun.scored_by === 'mixed' ? 'Some postings were scored by keywords because the model did not answer.'
                  : lastRun.read ? 'Scored on this computer by your local model.' : lastRun.message}
              </div>
            </>
          ) : (
            <div className="font-display text-xl font-bold">No searches yet</div>
          )}
        </div>
        <div className="flex flex-wrap gap-3">
          <button type="button" className={btn.onDark} onClick={() => go('preferences')}>Edit preferences</button>
          <button type="button" className={btn.accentOnDark} disabled={searching || !hasTitles} onClick={runSearch}>
            {searching && <Spinner />}{searching ? 'Searching…' : lastRun ? 'Search again' : 'Run search'}
          </button>
        </div>
      </div>

      {jobs.length === 0 ? (
        <div className="my-12 border-2 border-dashed border-ink p-8 text-center">
          <p className="mt-0 mb-2 font-display text-2xl font-bold">No postings yet</p>
          <p className="mt-0 mb-5 text-body">{hasTitles ? 'Run a search to fetch and score postings.' : 'Add at least one target role in Job preferences, then run a search.'}</p>
          {hasTitles
            ? <button type="button" className={btn.primary} disabled={searching} onClick={runSearch}>{searching && <Spinner />}Run search</button>
            : <button type="button" className={btn.primary} onClick={() => go('preferences')}>Set up preferences →</button>}
        </div>
      ) : (
        <div className="flex flex-wrap items-start gap-10 pt-10 pb-16">
          <aside aria-label="Sort and filter" className={cx(panel, 'flex min-w-0 flex-[1_1_16rem] flex-col gap-5 p-5 lg:sticky lg:top-6 lg:max-w-[20rem]', !filtersOpen && 'max-lg:py-0 max-lg:px-0 max-lg:border-0 max-lg:bg-transparent')}>
            <h2 className="m-0 font-display text-[22px] font-bold max-lg:hidden">Sort and filter</h2>
            <button type="button" aria-expanded={filtersOpen} aria-controls="filters" onClick={() => setFiltersOpen((o) => !o)}
              className={cx(btn.outline, 'w-full justify-between lg:hidden')}>
              <span>Sort and filter{active ? ` (${active} on)` : ''}</span><span aria-hidden="true">{filtersOpen ? '−' : '+'}</span>
            </button>
            <div id="filters" className={cx('flex flex-col gap-5', !filtersOpen && 'max-lg:hidden')}>
            <Field label="Sort by"><Select value={sort} onValue={(v) => setSort(v as Sort)} options={[...SORTS]} /></Field>
            <ChipGroup small label="Work setting" options={['All', 'Remote', 'Hybrid', 'On-site']} value={setting} onChange={(v) => setSetting(v as string)} />
            {types.length > 1 && <ChipGroup small label="Employment type" options={types} value={type} onChange={(v) => setType(v as string)} />}
            <Field label="Minimum match" aside={<strong className="font-display text-sm text-ink">{min === 0 ? 'Any' : `${min}+`}</strong>}>
              <input type="range" min={0} max={95} step={5} value={min} onChange={(e) => setMin(Number(e.target.value))} className="m-0 h-10 w-full" />
            </Field>
            <Field label="Posted"><Select value={within} onValue={setWithin} options={Object.keys(WITHIN)} /></Field>
            <label className="flex min-h-11 cursor-pointer items-center gap-2.5">
              <input type="checkbox" className="m-0 size-[22px]" checked={savedOnly} onChange={(e) => setSavedOnly(e.target.checked)} />
              <span className="font-medium">Saved only</span>
            </label>
            <button type="button" className={btn.outline} onClick={reset}>Reset filters</button>
            </div>
          </aside>

          <div className="min-w-0 flex-[999_1_32rem]">
            <div className="mb-7 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2 border-b-4 border-ink pb-4">
              <h2 className="m-0 font-display text-[clamp(1.375rem,4vw,1.75rem)] font-bold tracking-[-0.02em]" aria-live="polite">
                {list.length} of {jobs.length} postings
              </h2>
              <span className="text-sm text-body">Sorted by {sort.toLowerCase()}</span>
            </div>

            {list.length === 0 && (
              <div className="border-2 border-dashed border-ink p-8 text-center">
                <p className="mt-0 mb-4 font-display text-xl font-bold">No postings match these filters.</p>
                <button type="button" className={btn.primary} onClick={reset}>Reset filters</button>
              </div>
            )}

            <ol className="m-0 flex list-none flex-col gap-7 p-0">
              {list.slice(0, limit).map((j) => {
                const s = j.match_score
                const badge = s >= 85 ? 'bg-accent text-ink' : s >= 70 ? 'bg-ink text-white' : 'bg-white text-ink'
                const posted = j.posted ? j.posted.replace(/^Posted:?\s*/i, '') : `Found ${ago(dayOf(j))}`
                return (
                  <li key={j.id}>
                    <article className={cx(panel, 'flex flex-col gap-4 p-4 shadow-hard sm:p-[22px]')}>
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <div className={cx(labelText, 'text-subtle')}>{[j.source, posted].filter(Boolean).join(' · ')}</div>
                          <h3 className="mt-1 mb-0.5 font-display text-[clamp(1.25rem,3.5vw,1.5rem)] font-bold leading-[1.15] tracking-[-0.02em] [overflow-wrap:anywhere]">{j.title}</h3>
                          <div>{[j.company, j.location].filter(Boolean).join(' · ')}</div>
                        </div>
                        <div className={cx('flex size-[76px] flex-none flex-col items-center justify-center border-2 border-ink', badge)} aria-label={`${s} percent match`}>
                          <span className="font-display text-3xl leading-none font-bold">{s}</span>
                          <span className="font-display text-[10px] font-semibold uppercase tracking-[0.08em]">match</span>
                        </div>
                      </div>

                      {(j.work_setting || j.employment_type || j.salary) && (
                        <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
                          {j.work_setting && <li className="bg-ink px-2.5 py-1 font-display text-[13px] font-semibold text-white">{j.work_setting}</li>}
                          {j.employment_type && <li className="border-2 border-ink bg-white px-2.5 py-0.5 font-display text-[13px] font-semibold">{j.employment_type}</li>}
                          {j.salary && <li className="border-2 border-ink bg-white px-2.5 py-0.5 font-display text-[13px] font-semibold">{j.salary}</li>}
                        </ul>
                      )}

                      {(j.match_reason || j.matched.length > 0 || j.gap) && (
                        <div className="flex flex-col gap-2.5 border-t-2 border-ink pt-3.5">
                          <div className={labelText}>Why it fits</div>
                          {j.match_reason && <p className="m-0">{j.match_reason}</p>}
                          {j.matched.length > 0 && (
                            <ul className="m-0 flex list-none flex-wrap gap-2 p-0" aria-label="Matched skills">
                              {j.matched.map((m) => <li key={m} className="bg-accent px-2.5 py-0.5 font-display text-[13px] font-semibold">{m}</li>)}
                            </ul>
                          )}
                          {j.gap && <p className="m-0 text-[15px] text-body"><strong className="font-display">Gap:</strong> {j.gap}</p>}
                        </div>
                      )}

                      {j.snippet && (
                        <details className="text-[15px] text-body">
                          <summary className="cursor-pointer font-display font-semibold text-ink">Posting details</summary>
                          <p className="mt-2 mb-0 whitespace-pre-line">{j.snippet}</p>
                        </details>
                      )}

                      <div className="flex flex-wrap gap-2.5">
                        <button type="button" aria-pressed={j.status === 'saved'} onClick={() => toggleSave(j)}
                          className={cx(btn.outline, 'min-h-11', j.status === 'saved' && 'bg-accent hover:not-disabled:bg-accent')}>
                          {j.status === 'saved' ? 'Saved ✓' : 'Save'}
                        </button>
                        {j.url && j.url !== '#' && (
                          <a href={j.url} target="_blank" rel="noreferrer" className={cx(btn.outline, 'min-h-11')}>
                            View posting <span aria-hidden="true">↗</span><span className="sr-only">(opens in a new tab)</span>
                          </a>
                        )}
                        <button type="button" className={cx(btn.ghost, 'min-h-11')} onClick={() => hide(j)}>Hide</button>
                      </div>
                    </article>
                  </li>
                )
              })}
            </ol>

            {list.length > limit && (
              <button type="button" className={cx(btn.outline, 'mt-8 w-full')} onClick={() => setLimit((n) => n + PAGE)}>
                Show {Math.min(PAGE, list.length - limit)} more
              </button>
            )}
          </div>
        </div>
      )}
    </>
  )
}
