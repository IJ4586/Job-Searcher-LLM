import type { Experience, Preferences, Settings } from './api'

// Mirrors the defaults in backend/main.py. Used before data loads and for "Reset to defaults".

export const emptyExperience = (): Experience => ({
  basics: { first_name: '', last_name: '', email: '', phone: '', career_stage: '', headline: '', country: '', region: '', city: '', linkedin: '', github: '', website: '' },
  summary: '',
  work: [],
  projects: [],
  education: [],
  skills: { technical: [], tools: [], soft: [] },
  languages: [],
  certifications: [],
  activities: [],
})

export const defaultPreferences = (): Preferences => ({
  titles: [],
  days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
  hours_start: '09:00',
  hours_end: '17:00',
  flexible_hours: false,
  shifts: ['Day'],
  employment_types: ['Full-time'],
  pay_basis: 'annual',
  currency: 'CAD',
  min_pay: null,
  target_pay: null,
  include_unlisted_pay: true,
  benefits: [],
  work_settings: [],
  work_areas: [],
  max_commute: 45,
  travel_mode: 'Public transit',
  relocation: 'Not open',
  work_authorization: '',
  available_from: '',
  notice_period: 'Immediately',
  graduation: '',
  open_to_internships: false,
  start_immediately: false,
  home: { country: '', region: '', city: '', district: '', postal: '' },
  posting_limit: 25,
  skip_seen: true,
})

export const defaultSettings = (ollamaUrl = 'http://localhost:11434'): Settings => ({
  ollama_url: ollamaUrl,
  model: '',
  temperature: 0.2,
  num_ctx: 8192,
  max_tokens: 1024,
  keep_loaded: false,
  strictness: 'Balanced',
  weights: { skills: 30, title: 25, location: 20, pay: 15, level: 10 },
  min_score: 0,
  explain: true,
  gaps: true,
  sources: { jobbank: true, feeds: false },
  feed_urls: [],
})
