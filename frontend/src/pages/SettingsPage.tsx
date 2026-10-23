import { useState } from 'react'
import { api, type Health, type Settings } from '../api'
import type { Notify } from '../App'
import { defaultSettings } from '../defaults'
import type { Doc } from '../store'
import { btn, cx, grid, inputCls, labelText, panel } from '../styles'
import { ChipGroup, Dot, Field, PageHero, SaveBar, Section, Select, Spinner, TextArea, TextInput, Toggle } from '../ui'

const STRICT_HINT: Record<Settings['strictness'], string> = {
  Broad: 'Shows near misses too, so unusual roles do not slip past.',
  Balanced: 'A fair mix. Close matches rank high, stretch roles rank lower.',
  Strict: 'Only scores high when a posting meets nearly every requirement you set.',
}
const WEIGHTS: [keyof Settings['weights'], string][] = [
  ['skills', 'Skills match'], ['title', 'Job title'], ['location', 'Location and commute'], ['pay', 'Pay'], ['level', 'Experience level'],
]
const CTX = [4096, 8192, 16384, 32768]

export default function SettingsPage({ doc, health, refreshHealth, notify, reloadAll, reloadJobs }: {
  doc: Doc<Settings>; health: Health | null; refreshHealth: () => Promise<void>; notify: Notify; reloadAll: () => Promise<void>; reloadJobs: () => Promise<void>
}) {
  const s = doc.data
  const set = <K extends keyof Settings>(k: K, v: Settings[K]) => doc.set((d) => ({ ...d, [k]: v }))
  const [test, setTest] = useState<{ state: 'idle' | 'testing' | 'ok' | 'fail'; text: string }>({ state: 'idle', text: 'Not tested yet' })
  const [busy, setBusy] = useState('')

  const total = WEIGHTS.reduce((n, [k]) => n + s.weights[k], 0) || 1

  const save = async () => {
    try { await doc.save(); notify('Settings saved.'); refreshHealth() } catch (err) { notify('Could not save: ' + (err as Error).message) }
  }

  const runTest = async () => {
    setTest({ state: 'testing', text: 'Loading the model and asking it a question…' })
    try {
      if (doc.dirty) await doc.save()
      await refreshHealth()
      const r = await api.testModel()
      setTest({ state: 'ok', text: `Connected. ${r.model} answered in ${r.seconds}s.` })
    } catch (err) {
      setTest({ state: 'fail', text: (err as Error).message })
    }
  }

  const exportData = async () => {
    setBusy('export')
    try {
      const data = await api.exportAll()
      const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }))
      const a = document.createElement('a')
      a.href = url
      a.download = `careercue-export-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) { notify('Export failed: ' + (err as Error).message) } finally { setBusy('') }
  }

  const clearPostings = async () => {
    if (!window.confirm('Remove all postings except the ones you saved?')) return
    setBusy('clear')
    try { await api.clearJobs(); await reloadJobs(); notify('Postings cleared. Saved postings were kept.') }
    catch (err) { notify((err as Error).message) } finally { setBusy('') }
  }

  const deleteEverything = async () => {
    if (!window.confirm('Delete your profile, preferences, settings and all postings from this computer? This cannot be undone.')) return
    setBusy('delete')
    try { await api.deleteAll(); await reloadAll(); notify('Everything was deleted.') }
    catch (err) { notify((err as Error).message) } finally { setBusy('') }
  }

  const models = health?.models ?? []
  const conn = !health ? { tone: 'bad' as const, text: 'Checking…' }
    : health.ai ? { tone: 'ok' as const, text: 'Ready' }
    : health.reachable ? { tone: 'warn' as const, text: 'Model not installed' }
    : { tone: 'bad' as const, text: 'Ollama not reachable' }

  return (
    <>
      <PageHero step={4} title="Settings and LLM" tag="Tune the engine"
        intro="Choose the model that does the matching, decide how strict it is, and control where your data lives." />

      <div className="flex flex-wrap items-start gap-10 pt-12 pb-16">
        <div className="min-w-0 flex-[999_1_34rem]">
          <Section num="01" title="Local model" desc={<>CareerCue talks to <a href="https://ollama.com" target="_blank" rel="noreferrer" className="font-semibold text-ink">Ollama</a> running on this computer.</>}>
            <div className={grid}>
              <Field label="Ollama address"><TextInput value={s.ollama_url} onValue={(v) => set('ollama_url', v)} spellCheck={false} /></Field>
              <Field label="Model" hint={models.length ? 'Models installed in Ollama.' : 'Type a model name, for example llama3.1:8b.'}>
                {models.length
                  ? <Select value={s.model} onValue={(v) => set('model', v)} options={models} placeholder="Use the default model" />
                  : <TextInput value={s.model} onValue={(v) => set('model', v)} placeholder={health?.model ?? ''} spellCheck={false} />}
              </Field>
              <Field label="Context window" hint="Larger windows read longer postings but need more memory.">
                <Select value={String(s.num_ctx)} onValue={(v) => set('num_ctx', Number(v))} options={CTX.map((n) => ({ value: String(n), label: `${n.toLocaleString()} tokens` }))} />
              </Field>
              <Field label="Temperature" aside={<strong className="font-display text-sm text-ink">{s.temperature.toFixed(1)}</strong>} hint="Lower gives more consistent scores.">
                <input type="range" min={0} max={1} step={0.1} value={s.temperature} onChange={(e) => set('temperature', Number(e.target.value))} className="m-0 h-12 w-full" />
              </Field>
              <Field label="Max reply length" hint="Tokens per batch of five postings.">
                <input type="number" min={128} max={8192} step={128} className={inputCls} value={s.max_tokens}
                  onChange={(e) => set('max_tokens', Math.max(128, Math.min(8192, Number(e.target.value) || 128)))} />
              </Field>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <button type="button" className={btn.dark} disabled={test.state === 'testing'} onClick={runTest}>
                {test.state === 'testing' && <Spinner light />}Test connection
              </button>
              <span aria-live="polite" className={cx('inline-flex items-center gap-2 border-2 px-3 py-1 font-display text-sm font-semibold',
                test.state === 'ok' ? 'border-ink bg-accent' : test.state === 'fail' ? 'border-danger bg-white text-danger' : 'border-ink bg-white')}>
                {test.text}
              </span>
            </div>
            <div className="border-t-2 border-ink pt-4">
              <Toggle label="Keep the model loaded between runs" desc="Starts the next search sooner but holds on to memory for 30 minutes."
                on={s.keep_loaded} onChange={(v) => set('keep_loaded', v)} />
            </div>
          </Section>

          <Section num="02" title="How matching works" desc="Decide how picky the model is and what counts most when it scores a posting.">
            <ChipGroup label="Strictness" options={['Broad', 'Balanced', 'Strict'] as const} value={s.strictness}
              onChange={(v) => set('strictness', v as Settings['strictness'])} hint={STRICT_HINT[s.strictness]} />
            <div className={cx(panel, 'flex flex-col gap-4 p-5')}>
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <h3 className="m-0 font-display text-lg font-bold">What matters most</h3>
                <span className="text-[13px] text-subtle">Shares always add up to 100%</span>
              </div>
              {WEIGHTS.map(([k, label]) => (
                <label key={k} className="flex flex-col gap-0.5">
                  <span className="flex items-baseline justify-between"><span className="font-semibold">{label}</span>
                    <span className="font-display font-bold">{Math.round((100 * s.weights[k]) / total)}%</span></span>
                  <input type="range" min={0} max={100} step={5} value={s.weights[k]} className="m-0 h-9 w-full"
                    onChange={(e) => doc.set((d) => ({ ...d, weights: { ...d.weights, [k]: Number(e.target.value) } }))} />
                </label>
              ))}
            </div>
            <Field label="Starting filter on Job postings" aside={<strong className="font-display text-sm text-ink">{s.min_score === 0 ? 'Show everything' : `${s.min_score}+ match`}</strong>}
              hint="Postings below this are filtered out by default. You can still lower the filter there.">
              <input type="range" min={0} max={90} step={5} value={s.min_score} onChange={(e) => set('min_score', Number(e.target.value))} className="m-0 h-10 w-full" />
            </Field>
            <div className="flex flex-col gap-3.5 border-t-2 border-ink pt-4">
              <Toggle label="Explain every match" desc="Adds a short reason under each score." on={s.explain} onChange={(v) => set('explain', v)} />
              <Toggle label="Point out gaps" desc="Names the biggest requirement you do not meet yet." on={s.gaps} onChange={(v) => set('gaps', v)} />
            </div>
          </Section>

          <Section num="03" title="Where postings come from" desc="These are the only sites CareerCue contacts. Your profile is never sent to them, only your job titles and search location.">
            <div className="flex flex-col gap-3.5">
              <Toggle label="Job Bank (Canada)" desc="The Government of Canada job board at jobbank.gc.ca." on={s.sources.jobbank}
                onChange={(v) => doc.set((d) => ({ ...d, sources: { ...d.sources, jobbank: v } }))} />
              <Toggle label="Custom job feeds" desc="RSS or Atom feeds from employers or job boards that offer them." on={s.sources.feeds}
                onChange={(v) => doc.set((d) => ({ ...d, sources: { ...d.sources, feeds: v } }))} />
            </div>
            {s.sources.feeds && (
              <Field label="Feed addresses" hint="One RSS or Atom feed URL per line.">
                <TextArea rows={4} value={s.feed_urls.join('\n')} onValue={(v) => set('feed_urls', v.split('\n'))} placeholder="https://example.com/jobs.rss" />
              </Field>
            )}
            {!s.sources.jobbank && !(s.sources.feeds && s.feed_urls.some((u) => u.trim())) && (
              <p className="m-0 border-2 border-danger bg-white p-3 text-danger">Turn on at least one source, or searches will have nothing to read.</p>
            )}
          </Section>

          <Section num="04" title="Your data" desc={<>Everything lives in <code className="bg-panel px-1">backend/careercue.db</code> on this computer. Export it or wipe it whenever you like.</>}>
            <div className="flex flex-wrap gap-3">
              <button type="button" className={cx(btn.outline, 'shadow-hard-sm')} disabled={!!busy} onClick={exportData}>{busy === 'export' && <Spinner />}Export all data</button>
              <button type="button" className={btn.outline} disabled={!!busy} onClick={clearPostings}>{busy === 'clear' && <Spinner />}Clear postings (keep saved)</button>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-2 border-danger bg-white px-5 py-4">
              <div className="min-w-0 flex-[1_1_16rem]">
                <div className="font-display text-[17px] font-bold text-danger">Delete everything</div>
                <div className="text-sm text-body">Removes your profile, preferences, settings and postings from this computer. This cannot be undone.</div>
              </div>
              <button type="button" className={btn.danger} disabled={!!busy} onClick={deleteEverything}>{busy === 'delete' && <Spinner light />}Delete all data…</button>
            </div>
          </Section>

          <SaveBar dirty={doc.dirty} saving={doc.saving} onSave={save} note="Settings saved.">
            <button type="button" className={btn.ghost} onClick={() => doc.set(defaultSettings(s.ollama_url))}>Reset to defaults</button>
          </SaveBar>
        </div>

        <aside className="flex min-w-0 max-w-[25rem] flex-[1_1_18rem] flex-col gap-6 lg:sticky lg:top-6">
          <div className={cx(panel, 'p-5 shadow-hard')}>
            <div className="mb-3.5 flex items-center justify-between gap-3">
              <h2 className="m-0 font-display text-xl font-bold">Connection</h2>
              <button type="button" className={cx(btn.outline, 'min-h-9 px-3 text-sm')} onClick={refreshHealth}>Refresh</button>
            </div>
            <div className="mb-3.5 inline-flex items-center gap-2 border-2 border-ink bg-white px-3 py-1 font-display text-sm font-semibold"><Dot tone={conn.tone} />{conn.text}</div>
            <dl className="m-0 flex flex-col">
              {([['Address', health?.url ?? s.ollama_url], ['Model', health?.model ?? '—'], ['Installed models', String(models.length)]] as const).map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 border-t-2 border-ink py-2.5">
                  <dt className={cx(labelText, 'pt-0.5')}>{k}</dt>
                  <dd className="m-0 min-w-0 text-right font-medium [overflow-wrap:anywhere]">{v}</dd>
                </div>
              ))}
            </dl>
            {health?.error && <p className="mt-2 mb-0 text-sm text-body">{health.error}</p>}
          </div>
          <div className="border-2 border-ink p-5">
            <h2 className="mt-0 mb-2.5 font-display text-xl font-bold">No model yet?</h2>
            <ol className="m-0 flex flex-col gap-2 pl-5">
              <li>Install Ollama from ollama.com and open it.</li>
              <li>In a terminal run <code className="bg-panel px-1 [overflow-wrap:anywhere]">ollama pull {health?.model ?? 'gemma4:e4b'}</code></li>
              <li>Come back and press Test connection.</li>
            </ol>
            <p className="mt-3 mb-0 text-sm text-body">A smaller model runs faster. A larger one explains its matches better.</p>
          </div>
        </aside>
      </div>
    </>
  )
}
