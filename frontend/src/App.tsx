import { useEffect, useState } from 'react'

type Job = {
  id: number
  title: string
  company: string
  location: string
  url: string
  snippet: string
  match_score: number
  match_reason: string
  status: string
}

type Experience = {
  summary: string
  skills: string[]
  history: string
}

type Preferences = {
  roles: string[]
  location: string
  remote_pref: string
  min_salary: string
}

type HealthStatus = {
  ai: boolean
  model: string
  models: string[]
}

type Tab = 'jobs' | 'experience' | 'preferences' | 'health'

const api = async <T,>(path: string, init?: RequestInit): Promise<T> => {
  const r = await fetch(path, init)
  if (!r.ok) throw new Error(await r.text())
  return r.json()
}

const send = (method: string, body: unknown): RequestInit => ({
  method,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
})

const label = 'text-[10px] font-semibold uppercase tracking-[0.28em]'
const btnDark = 'w-full bg-ink px-6 py-4 text-[11px] font-semibold uppercase tracking-[0.3em] text-paper transition active:opacity-70 disabled:opacity-40'
const btnLine = 'w-full border border-ink px-6 py-4 text-[11px] font-semibold uppercase tracking-[0.3em] text-ink transition active:bg-ink active:text-paper'
const field = 'w-full border-0 border-b border-ink bg-transparent px-0 py-2 font-deck text-xl outline-none focus:border-oxblood'

function Section({ kicker, title, sub }: { kicker: string; title: string; sub?: string }) {
  return (
    <div className="mb-8 border-b border-rule pb-6">
      <span className={label + ' text-mute mb-2 block'}>{kicker}</span>
      <h1 className="font-deck text-3xl font-normal tracking-tight text-ink sm:text-4xl">{title}</h1>
      {sub && <p className="mt-2 text-sm text-charcoal">{sub}</p>}
    </div>
  )
}

function Field({ name, children }: { name: string; children: React.ReactNode }) {
  return (
    <label className="block mb-6">
      <span className={label + ' text-mute mb-2 block'}>{name}</span>
      {children}
    </label>
  )
}

export default function App() {
  const [tab, setTab] = useState<Tab>('jobs')
  const [jobs, setJobs] = useState<Job[]>([])
  const [experience, setExperience] = useState<Experience>({ summary: '', skills: [], history: '' })
  const [preferences, setPreferences] = useState<Preferences>({ roles: [], location: '', remote_pref: '', min_salary: '' })
  const [health, setHealth] = useState<HealthStatus>({ ai: false, model: 'auto', models: [] })
  const [searching, setSearching] = useState(false)
  const [newSkill, setNewSkill] = useState('')
  const [newRole, setNewRole] = useState('')

  const loadAll = async () => {
    try {
      const [j, e, p, h] = await Promise.all([
        api<Job[]>('/api/jobs'),
        api<Experience>('/api/experience'),
        api<Preferences>('/api/preferences'),
        api<HealthStatus>('/api/health'),
      ])
      setJobs(j)
      setExperience(e)
      setPreferences(p)
      setHealth(h)
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    loadAll()
  }, [])

  const handleSearch = async () => {
    setSearching(true)
    try {
      const res = await api<{ jobs: Job[] }>('/api/jobs/search', { method: 'POST' })
      setJobs(res.jobs)
    } catch (err) {
      alert('Search failed: ' + err)
    } finally {
      setSearching(false)
    }
  }

  const saveExperience = async () => {
    try {
      const updated = await api<Experience>('/api/experience', send('PUT', experience))
      setExperience(updated)
      alert('Experience saved successfully!')
    } catch (err) {
      alert('Error saving experience: ' + err)
    }
  }

  const savePreferences = async () => {
    try {
      const updated = await api<Preferences>('/api/preferences', send('PUT', preferences))
      setPreferences(updated)
      alert('Preferences saved successfully!')
    } catch (err) {
      alert('Error saving preferences: ' + err)
    }
  }

  return (
    <div className="min-h-screen bg-paper text-ink font-sans selection:bg-ink selection:text-paper">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-rule bg-paper/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div className="flex items-center space-x-3">
            <span className="font-deck text-2xl font-normal tracking-tight">CareerCue</span>
            <span className="rounded-full bg-rule px-2.5 py-0.5 text-[10px] uppercase tracking-widest text-charcoal">
              Local LLM Job Matcher
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <span className={`h-2 w-2 rounded-full ${health.ai ? 'bg-success' : 'bg-warning'}`} />
            <span className="text-[11px] uppercase tracking-widest text-charcoal">
              {health.ai ? `Ollama Ready (${health.model})` : 'Ollama Offline'}
            </span>
          </div>
        </div>
      </header>

      {/* Nav */}
      <nav className="border-b border-rule bg-paper">
        <div className="mx-auto flex max-w-5xl space-x-8 px-6">
          {(['jobs', 'experience', 'preferences', 'health'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`border-b-2 py-4 text-[11px] font-semibold uppercase tracking-[0.3em] transition ${
                tab === t ? 'border-ink text-ink' : 'border-transparent text-mute hover:text-ink'
              }`}
            >
              {t === 'jobs' && 'Job Postings'}
              {t === 'experience' && 'My Experience'}
              {t === 'preferences' && 'Job Preferences'}
              {t === 'health' && 'System & LLM'}
            </button>
          ))}
        </div>
      </nav>

      {/* Main Content */}
      <main className="mx-auto max-w-5xl px-6 py-12">
        {tab === 'jobs' && (
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 pb-6 border-b border-rule gap-4">
              <Section kicker="AI Job Search" title="Relevant Local & Remote Postings" sub="Searched live from the web and matched against your exact experience using your local LLM." />
              <button
                onClick={handleSearch}
                disabled={searching}
                className="bg-ink text-paper px-6 py-4 text-[11px] font-semibold uppercase tracking-[0.3em] transition active:opacity-70 disabled:opacity-40 self-start sm:self-auto"
              >
                {searching ? 'Searching Web & Matching...' : 'Search New Jobs'}
              </button>
            </div>

            {jobs.length === 0 ? (
              <div className="py-20 text-center border border-dashed border-rule rounded-lg">
                <p className="text-sm text-mute mb-4">No jobs searched yet or search returned empty.</p>
                <button onClick={handleSearch} className="inline-block bg-ink text-paper px-6 py-3 text-[11px] font-semibold uppercase tracking-[0.3em]">
                  Run Initial AI Job Search
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {jobs.map((job) => (
                  <div key={job.id} className="border border-rule p-6 bg-paper hover:border-ink transition">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                      <div>
                        <h2 className="font-deck text-2xl font-normal text-ink">{job.title}</h2>
                        <p className="text-xs uppercase tracking-wider text-charcoal">{job.company} • {job.location}</p>
                      </div>
                      <div className="flex items-center space-x-3">
                        <span className="rounded bg-rule px-3 py-1 text-xs font-bold text-ink">
                          {job.match_score}% Match
                        </span>
                        <a
                          href={job.url}
                          target="_blank"
                          rel="noreferrer"
                          className="bg-ink text-paper px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.2em]"
                        >
                          View Job
                        </a>
                      </div>
                    </div>
                    <p className="text-sm text-charcoal mb-4">{job.snippet}</p>
                    <div className="border-t border-rule pt-3">
                      <span className="text-[10px] uppercase tracking-widest text-mute block mb-1">AI Match Analysis</span>
                      <p className="text-xs italic text-ink">{job.match_reason}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'experience' && (
          <div>
            <Section kicker="Resume & Background" title="Your Experience & Skills" sub="Your local LLM uses this context to evaluate job descriptions and highlight precise skill overlaps." />
            
            <div className="max-w-2xl space-y-6">
              <Field name="Professional Summary">
                <textarea
                  rows={4}
                  className={field}
                  value={experience.summary}
                  onChange={(e) => setExperience({ ...experience, summary: e.target.value })}
                />
              </Field>

              <Field name="Skills">
                <div className="flex flex-wrap gap-2 mb-3">
                  {experience.skills.map((s, idx) => (
                    <span key={idx} className="inline-flex items-center border border-ink px-3 py-1 text-xs uppercase tracking-wider bg-rule">
                      {s}
                      <button
                        type="button"
                        onClick={() => setExperience({ ...experience, skills: experience.skills.filter((_, i) => i !== idx) })}
                        className="ml-2 text-mute hover:text-ink font-bold"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Add skill (e.g. Python, Kubernetes)"
                    className={field}
                    value={newSkill}
                    onChange={(e) => setNewSkill(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && newSkill.trim()) {
                        e.preventDefault()
                        setExperience({ ...experience, skills: [...experience.skills, newSkill.trim()] })
                        setNewSkill('')
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (newSkill.trim()) {
                        setExperience({ ...experience, skills: [...experience.skills, newSkill.trim()] })
                        setNewSkill('')
                      }
                    }}
                    className="border border-ink px-6 py-2 text-[11px] font-semibold uppercase tracking-[0.3em]"
                  >
                    Add
                  </button>
                </div>
              </Field>

              <Field name="Work History & Experience Details">
                <textarea
                  rows={6}
                  className={field}
                  value={experience.history}
                  onChange={(e) => setExperience({ ...experience, history: e.target.value })}
                />
              </Field>

              <button onClick={saveExperience} className={btnDark}>
                Save Experience
              </button>
            </div>
          </div>
        )}

        {tab === 'preferences' && (
          <div>
            <Section kicker="Target Criteria" title="Job Preferences & Goals" sub="Configure what roles, locations, and salary range you are targeting." />

            <div className="max-w-2xl space-y-6">
              <Field name="Target Roles">
                <div className="flex flex-wrap gap-2 mb-3">
                  {preferences.roles.map((r, idx) => (
                    <span key={idx} className="inline-flex items-center border border-ink px-3 py-1 text-xs uppercase tracking-wider bg-rule">
                      {r}
                      <button
                        type="button"
                        onClick={() => setPreferences({ ...preferences, roles: preferences.roles.filter((_, i) => i !== idx) })}
                        className="ml-2 text-mute hover:text-ink font-bold"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Add target role (e.g. Senior Backend Engineer)"
                    className={field}
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && newRole.trim()) {
                        e.preventDefault()
                        setPreferences({ ...preferences, roles: [...preferences.roles, newRole.trim()] })
                        setNewRole('')
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (newRole.trim()) {
                        setPreferences({ ...preferences, roles: [...preferences.roles, newRole.trim()] })
                        setNewRole('')
                      }
                    }}
                    className="border border-ink px-6 py-2 text-[11px] font-semibold uppercase tracking-[0.3em]"
                  >
                    Add
                  </button>
                </div>
              </Field>

              <Field name="Location / Region">
                <input
                  type="text"
                  className={field}
                  value={preferences.location}
                  onChange={(e) => setPreferences({ ...preferences, location: e.target.value })}
                />
              </Field>

              <Field name="Remote / Hybrid Preference">
                <select
                  className={field}
                  value={preferences.remote_pref}
                  onChange={(e) => setPreferences({ ...preferences, remote_pref: e.target.value })}
                >
                  <option value="Remote">Remote Only</option>
                  <option value="Hybrid">Hybrid</option>
                  <option value="On-site">On-site</option>
                  <option value="Flexible">Flexible</option>
                </select>
              </Field>

              <Field name="Minimum Salary Expectation">
                <input
                  type="text"
                  className={field}
                  value={preferences.min_salary}
                  onChange={(e) => setPreferences({ ...preferences, min_salary: e.target.value })}
                />
              </Field>

              <button onClick={savePreferences} className={btnDark}>
                Save Preferences
              </button>
            </div>
          </div>
        )}

        {tab === 'health' && (
          <div>
            <Section kicker="Local LLM Diagnostics" title="Ollama Status & Models" sub="CareerCue runs 100% locally via Ollama open-weight models." />

            <div className="max-w-2xl border border-rule p-6 space-y-4">
              <div className="flex justify-between items-center border-b border-rule pb-4">
                <span className={label}>Connection Status</span>
                <span className={`px-3 py-1 text-xs font-bold uppercase tracking-wider ${health.ai ? 'bg-success/20 text-success' : 'bg-warning/20 text-warning'}`}>
                  {health.ai ? 'Connected' : 'Disconnected'}
                </span>
              </div>
              <div className="flex justify-between items-center border-b border-rule pb-4">
                <span className={label}>Configured Model</span>
                <span className="font-mono text-sm">{health.model}</span>
              </div>
              <div>
                <span className={label + ' mb-2 block'}>Available Ollama Models</span>
                <div className="flex flex-wrap gap-2">
                  {health.models.length === 0 ? (
                    <p className="text-sm text-mute">No models detected. Ensure Ollama is running locally.</p>
                  ) : (
                    health.models.map((m, idx) => (
                      <span key={idx} className="border border-rule px-3 py-1 text-xs font-mono bg-rule">
                        {m}
                      </span>
                    ))
                  )}
                </div>
              </div>
              <button onClick={loadAll} className={btnLine + ' mt-4'}>
                Refresh Status
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
