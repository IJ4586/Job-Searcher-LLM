// Types mirror the pydantic models in backend/main.py.

export type Basics = {
  first_name: string; last_name: string; email: string; phone: string
  career_stage: string; headline: string
  country: string; region: string; city: string
  linkedin: string; github: string; website: string
}
export type Work = {
  title: string; company: string; location: string; employment_type: string; arrangement: string
  start: string; end: string; current: boolean; description: string; skills: string
}
export type Project = { name: string; role: string; link: string; start: string; end: string; tech: string; description: string }
export type Education = {
  institution: string; credential: string; field: string; location: string
  start: string; end: string; current: boolean; grade: string; honours: string; coursework: string
}
export type Language = { language: string; proficiency: string }
export type Certification = { name: string; issuer: string; issued: string; expires: string; credential: string }
export type Activity = { type: string; title: string; organization: string; location: string; date: string; details: string }
export type Experience = {
  basics: Basics
  summary: string
  work: Work[]
  projects: Project[]
  education: Education[]
  skills: { technical: string[]; tools: string[]; soft: string[] }
  languages: Language[]
  certifications: Certification[]
  activities: Activity[]
}

export type Preferences = {
  titles: string[]
  days: string[]
  hours_start: string
  hours_end: string
  flexible_hours: boolean
  shifts: string[]
  employment_types: string[]
  pay_basis: 'annual' | 'hourly'
  currency: string
  min_pay: number | null
  target_pay: number | null
  include_unlisted_pay: boolean
  benefits: string[]
  work_settings: string[]
  work_areas: string[]
  max_commute: number
  travel_mode: string
  relocation: string
  work_authorization: string
  available_from: string
  notice_period: string
  graduation: string
  open_to_internships: boolean
  start_immediately: boolean
  home: { country: string; region: string; city: string; district: string; postal: string }
  posting_limit: number
  skip_seen: boolean
}

export type Settings = {
  ollama_url: string
  model: string
  temperature: number
  num_ctx: number
  max_tokens: number
  keep_loaded: boolean
  strictness: 'Broad' | 'Balanced' | 'Strict'
  weights: { skills: number; title: number; location: number; pay: number; level: number }
  min_score: number
  explain: boolean
  gaps: boolean
  sources: { jobbank: boolean; feeds: boolean }
  feed_urls: string[]
}

export type Health = { ai: boolean; reachable: boolean; model: string; models: string[]; url: string; error: string }

export type Job = {
  id: number
  title: string
  company: string
  location: string
  url: string
  snippet: string
  match_score: number
  match_reason: string
  status: 'new' | 'saved' | 'hidden'
  created_at: string
  salary: string | null
  pay_value: number | null
  posted: string | null
  posted_at: string | null
  source: string | null
  work_setting: string | null
  employment_type: string | null
  matched: string[]
  gap: string | null
  scored_by: string | null
}

export type Run = { id: number; started_at: string; read: number; strong: number; scored_by: string; message: string }
export type SearchResult = { ok: boolean; read: number; strong: number; scored_by: string; message: string; jobs: Job[] }

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  let r: Response
  try {
    r = await fetch('/api' + path, init)
  } catch {
    throw new Error('Cannot reach the CareerCue server. Is the backend running?')
  }
  if (!r.ok) {
    const body = await r.json().catch(() => null)
    const detail = body?.detail
    const msg = typeof detail === 'string' ? detail
      : Array.isArray(detail) ? detail.map((d: { msg?: string }) => d.msg).filter(Boolean).join('; ')
      : `Request failed (${r.status})`
    throw new Error(msg)
  }
  return r.json()
}

const json = (method: string, body: unknown): RequestInit => ({
  method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
})

export const api = {
  health: () => call<Health>('/health'),
  testModel: () => call<{ ok: boolean; model: string; seconds: number }>('/settings/test', { method: 'POST' }),
  experience: () => call<Experience>('/experience'),
  saveExperience: (e: Experience) => call<Experience>('/experience', json('PUT', e)),
  importResume: (file: File) => {
    const fd = new FormData()
    fd.append('file', file)
    return call<Experience>('/experience/import', { method: 'POST', body: fd })
  },
  preferences: () => call<Preferences>('/preferences'),
  savePreferences: (p: Preferences) => call<Preferences>('/preferences', json('PUT', p)),
  settings: () => call<Settings>('/settings'),
  saveSettings: (s: Settings) => call<Settings>('/settings', json('PUT', s)),
  jobs: () => call<Job[]>('/jobs'),
  search: () => call<SearchResult>('/jobs/search', { method: 'POST' }),
  lastRun: () => call<Run | null>('/runs/last'),
  setJobStatus: (id: number, status: Job['status']) => call<Job>(`/jobs/${id}`, json('PATCH', { status })),
  clearJobs: () => call<{ ok: boolean }>('/jobs?keep_saved=true', { method: 'DELETE' }),
  exportAll: () => call<unknown>('/export'),
  deleteAll: () => call<{ ok: boolean }>('/data', { method: 'DELETE' }),
}

export const blank = {
  work: (): Work => ({ title: '', company: '', location: '', employment_type: '', arrangement: '', start: '', end: '', current: false, description: '', skills: '' }),
  project: (): Project => ({ name: '', role: '', link: '', start: '', end: '', tech: '', description: '' }),
  education: (): Education => ({ institution: '', credential: '', field: '', location: '', start: '', end: '', current: false, grade: '', honours: '', coursework: '' }),
  language: (): Language => ({ language: '', proficiency: '' }),
  certification: (): Certification => ({ name: '', issuer: '', issued: '', expires: '', credential: '' }),
  activity: (): Activity => ({ type: '', title: '', organization: '', location: '', date: '', details: '' }),
}
