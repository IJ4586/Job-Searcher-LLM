import { useRef, useState, type ReactNode } from 'react'
import { api, blank, type Experience, type Health } from '../api'
import type { Notify, Route } from '../App'
import type { Doc } from '../store'
import { btn, cx, grid, panel } from '../styles'
import { Card, Check, DateInput, Field, PageHero, SaveBar, Section, Select, Spinner, TagInput, TextArea, TextInput } from '../ui'

const STAGES = ['Student', 'Recent graduate', 'Early career (0–3 years)', 'Career changer', 'Returning to work']
const EMP_TYPES = ['Full-time', 'Part-time', 'Contract', 'Internship', 'Co-op or placement', 'Temporary', 'Freelance', 'Volunteer']
const ARRANGEMENTS = ['On-site', 'Hybrid', 'Remote']
const CREDENTIALS = ['Certificate', 'Diploma', 'Post-graduate certificate', 'Bachelor’s degree', 'Master’s degree', 'Doctorate', 'Bootcamp', 'High school', 'Other']
const PROFICIENCY = ['Basic', 'Conversational', 'Fluent', 'Native']
const ACTIVITY_TYPES = ['Hackathon', 'Volunteering', 'Club or society', 'Competition', 'Publication', 'Award']

const hasContent = (o: object) => Object.values(o).some((v) => (typeof v === 'string' ? v.trim() !== '' : false))

function Entries<T extends object>({ items, onChange, make, noun, titleOf, render }: {
  items: T[]
  onChange: (v: T[]) => void
  make: () => T
  noun: string
  titleOf: (item: T) => string
  render: (item: T, set: (patch: Partial<T>) => void) => ReactNode
}) {
  const remove = (i: number) => {
    if (hasContent(items[i]) && !window.confirm(`Remove this ${noun.toLowerCase()}?`)) return
    onChange(items.filter((_, j) => j !== i))
  }
  return (
    <>
      {items.length === 0 && <p className="m-0 text-body">Nothing added yet.</p>}
      {items.map((it, i) => (
        <Card key={i} title={titleOf(it) || `${noun} ${i + 1}`} onRemove={() => remove(i)}>
          {render(it, (patch) => onChange(items.map((x, j) => (j === i ? { ...x, ...patch } : x))))}
        </Card>
      ))}
      <button type="button" className={cx(btn.outline, 'self-start shadow-hard-sm')} onClick={() => onChange([...items, make()])}>
        + Add {items.length ? 'another ' : 'a '}{noun.toLowerCase()}
      </button>
    </>
  )
}

export default function ExperiencePage({ doc, notify, go, health }: { doc: Doc<Experience>; notify: Notify; go: (r: Route) => void; health: Health | null }) {
  const e = doc.data
  const set = doc.set
  const b = e.basics
  const setB = (k: keyof Experience['basics']) => (v: string) => set((d) => ({ ...d, basics: { ...d.basics, [k]: v } }))
  const setList = <K extends 'work' | 'projects' | 'education' | 'languages' | 'certifications' | 'activities'>(k: K) => (v: Experience[K]) => set((d) => ({ ...d, [k]: v }))
  const setSkills = (k: keyof Experience['skills']) => (v: string[]) => set((d) => ({ ...d, skills: { ...d.skills, [k]: v } }))

  const [importing, setImporting] = useState(false)
  const [dragging, setDragging] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const importFile = async (file: File | undefined) => {
    if (!file) return
    const filled = hasContent(e.basics) || e.summary.trim() || e.work.length || e.education.length
    if (filled && !window.confirm('Replace what is in the form now with what the model reads from this resume? Nothing is saved until you press Save.')) return
    setImporting(true)
    try {
      const draft = await api.importResume(file)
      set(draft)
      notify('Form filled from your resume. Check every field, then press Save.')
    } catch (err) {
      notify('Import failed: ' + (err as Error).message)
    } finally {
      setImporting(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const save = async () => {
    try { await doc.save(); notify('Experience saved.') } catch (err) { notify('Could not save: ' + (err as Error).message) }
  }

  const skillCount = e.skills.technical.length + e.skills.tools.length + e.skills.soft.length
  const checks: { id: string; label: string; done: boolean }[] = [
    { id: 'sec-basics', label: 'Basics and contact', done: !!(b.first_name && b.last_name && b.email && b.career_stage) },
    { id: 'sec-summary', label: 'Summary', done: e.summary.trim().length >= 60 },
    { id: 'sec-work', label: 'Work experience', done: e.work.some((w) => w.title && w.company) },
    { id: 'sec-projects', label: 'Projects', done: e.projects.some((p) => p.name) },
    { id: 'sec-education', label: 'Education', done: e.education.some((x) => x.institution) },
    { id: 'sec-skills', label: 'Skills (5 or more)', done: skillCount >= 5 },
    { id: 'sec-certs', label: 'Certifications', done: e.certifications.some((c) => c.name) },
    { id: 'sec-activities', label: 'Activities and extras', done: e.activities.some((a) => a.title) },
  ]
  const pct = Math.round((checks.filter((c) => c.done).length / checks.length) * 100)
  const modelReady = !!health?.ai

  return (
    <>
      <PageHero step={1} title="Your experience" tag="Build your profile"
        intro="Tell CareerCue what you have done so far. Your local model matches job postings against this, so more detail means better matches. Nothing leaves your computer." />

      <div
        className={cx('mt-8 flex flex-wrap items-center gap-x-8 gap-y-5 bg-ink p-5 text-white sm:p-6', dragging && 'outline-4 outline-accent')}
        onDragOver={(ev) => { ev.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={(ev) => { ev.preventDefault(); setDragging(false); if (modelReady && !importing) importFile(ev.dataTransfer.files[0]) }}
      >
        <div className="min-w-0 flex-[1_1_20rem]">
          <h2 className="m-0 font-display text-[26px] font-bold leading-[1.15] tracking-[-0.02em]">Skip the typing</h2>
          <p className="mt-2 mb-0 max-w-[32rem] text-[#e6e6e6]">
            Drop in your resume as a PDF, DOCX or TXT. Your local model reads it on this computer and fills in the form below. You review every field before anything is saved.
          </p>
          {!modelReady && (
            <p className="mt-2 mb-0 text-[#e6e6e6]">
              This needs the local model.{' '}
              <button type="button" onClick={() => go('settings')} className="cursor-pointer border-0 bg-transparent p-0 font-semibold text-accent underline">Set it up in Settings</button>.
            </p>
          )}
        </div>
        <div className="flex min-w-0 flex-[1_1_20rem] flex-wrap items-center justify-between gap-4 border-2 border-dashed border-white p-5">
          <span className="font-display font-semibold" aria-live="polite">{importing ? 'Reading your resume… this can take a minute.' : 'Drag a file here'}</span>
          <input ref={fileRef} type="file" accept=".pdf,.docx,.txt,.md" className="sr-only" id="resume-file" disabled={!modelReady || importing}
            onChange={(ev) => importFile(ev.target.files?.[0])} />
          <label htmlFor="resume-file" aria-disabled={!modelReady || importing}
            className={cx(btn.accentOnDark, (!modelReady || importing) && 'pointer-events-none opacity-50')}>
            {importing && <Spinner />}Choose file
          </label>
        </div>
      </div>

      <div className="flex flex-wrap items-start gap-10 pt-12 pb-16">
        <div className="min-w-0 flex-[999_1_34rem]">
          <Section id="sec-basics" num="01" title="Basics and contact" desc="Who you are and how employers reach you. Your contact details stay on this computer.">
            <div className={grid}>
              <Field label="First name"><TextInput value={b.first_name} onValue={setB('first_name')} autoComplete="given-name" /></Field>
              <Field label="Last name"><TextInput value={b.last_name} onValue={setB('last_name')} autoComplete="family-name" /></Field>
              <Field label="Email"><TextInput type="email" value={b.email} onValue={setB('email')} autoComplete="email" placeholder="name@example.com" /></Field>
              <Field label="Phone"><TextInput type="tel" value={b.phone} onValue={setB('phone')} autoComplete="tel" /></Field>
              <Field label="Career stage"><Select value={b.career_stage} onValue={setB('career_stage')} options={STAGES} placeholder="Select…" /></Field>
              <Field label="Professional headline" wide hint="One line that sums you up. The model reads this first.">
                <TextInput value={b.headline} onValue={setB('headline')} />
              </Field>
              <Field label="Country"><TextInput value={b.country} onValue={setB('country')} autoComplete="country-name" /></Field>
              <Field label="Province or state"><TextInput value={b.region} onValue={setB('region')} autoComplete="address-level1" /></Field>
              <Field label="City"><TextInput value={b.city} onValue={setB('city')} autoComplete="address-level2" /></Field>
              <Field label="LinkedIn URL"><TextInput type="url" value={b.linkedin} onValue={setB('linkedin')} placeholder="https://" /></Field>
              <Field label="GitHub or portfolio URL"><TextInput type="url" value={b.github} onValue={setB('github')} placeholder="https://" /></Field>
              <Field label="Personal website"><TextInput type="url" value={b.website} onValue={setB('website')} placeholder="https://" /></Field>
            </div>
          </Section>

          <Section id="sec-summary" num="02" title="Summary" desc="Two or three sentences about who you are, what you are good at and what you want next.">
            <Field label="About you" aside={`${e.summary.length} / 600`}>
              <TextArea rows={5} maxLength={600} value={e.summary} onValue={(v) => set((d) => ({ ...d, summary: v }))} placeholder="Write in your own words." />
            </Field>
          </Section>

          <Section id="sec-work" num="03" title="Work experience" desc="Jobs, internships, co-ops and freelance work, most recent first. Short stints count.">
            <Entries items={e.work} onChange={setList('work')} make={blank.work} noun="Position"
              titleOf={(w) => [w.title, w.company].filter(Boolean).join(' at ')}
              render={(w, p) => (
                <div className={grid}>
                  <Field label="Job title"><TextInput value={w.title} onValue={(v) => p({ title: v })} /></Field>
                  <Field label="Company"><TextInput value={w.company} onValue={(v) => p({ company: v })} /></Field>
                  <Field label="Location"><TextInput value={w.location} onValue={(v) => p({ location: v })} /></Field>
                  <Field label="Employment type"><Select value={w.employment_type} onValue={(v) => p({ employment_type: v })} options={EMP_TYPES} placeholder="Select…" /></Field>
                  <Field label="Work arrangement"><Select value={w.arrangement} onValue={(v) => p({ arrangement: v })} options={ARRANGEMENTS} placeholder="Select…" /></Field>
                  <Field label="Start date"><DateInput value={w.start} onValue={(v) => p({ start: v })} /></Field>
                  <Field label="End date" hint={w.current ? undefined : 'Leave empty if you still work here.'}><DateInput value={w.current ? '' : w.end} disabled={w.current} onValue={(v) => p({ end: v })} /></Field>
                  <Check label="I currently work here" checked={w.current} onChange={(v) => p({ current: v, end: v ? '' : w.end })} />
                  <Field label="What you did" wide hint="One achievement per line. Say what changed and by how much.">
                    <TextArea rows={5} value={w.description} onValue={(v) => p({ description: v })} />
                  </Field>
                  <Field label="Skills and tools used" wide hint="Separate with commas."><TextInput value={w.skills} onValue={(v) => p({ skills: v })} /></Field>
                </div>
              )} />
          </Section>

          <Section id="sec-projects" num="04" title="Projects" desc="Class work, side projects, open source and anything else you built.">
            <Entries items={e.projects} onChange={setList('projects')} make={blank.project} noun="Project" titleOf={(x) => x.name}
              render={(x, p) => (
                <div className={grid}>
                  <Field label="Project name"><TextInput value={x.name} onValue={(v) => p({ name: v })} /></Field>
                  <Field label="Your role"><TextInput value={x.role} onValue={(v) => p({ role: v })} /></Field>
                  <Field label="Project link"><TextInput type="url" value={x.link} onValue={(v) => p({ link: v })} placeholder="https://" /></Field>
                  <Field label="Start date"><DateInput value={x.start} onValue={(v) => p({ start: v })} /></Field>
                  <Field label="End date"><DateInput value={x.end} onValue={(v) => p({ end: v })} /></Field>
                  <Field label="Technologies used" hint="Separate with commas."><TextInput value={x.tech} onValue={(v) => p({ tech: v })} /></Field>
                  <Field label="What it does and what you did" wide hint="One point per line."><TextArea rows={4} value={x.description} onValue={(v) => p({ description: v })} /></Field>
                </div>
              )} />
          </Section>

          <Section id="sec-education" num="05" title="Education" desc="Degrees, diplomas, bootcamps and certificates. Include programs you are still working on.">
            <Entries items={e.education} onChange={setList('education')} make={blank.education} noun="School" titleOf={(x) => x.institution}
              render={(x, p) => (
                <div className={grid}>
                  <Field label="Institution"><TextInput value={x.institution} onValue={(v) => p({ institution: v })} /></Field>
                  <Field label="Credential"><Select value={x.credential} onValue={(v) => p({ credential: v })} options={CREDENTIALS} placeholder="Select…" /></Field>
                  <Field label="Field of study"><TextInput value={x.field} onValue={(v) => p({ field: v })} /></Field>
                  <Field label="Location"><TextInput value={x.location} onValue={(v) => p({ location: v })} /></Field>
                  <Field label="Start date"><DateInput value={x.start} onValue={(v) => p({ start: v })} /></Field>
                  <Field label={x.current ? 'Expected end date' : 'End date'}><DateInput value={x.end} onValue={(v) => p({ end: v })} /></Field>
                  <Check label="I am currently studying here" checked={x.current} onChange={(v) => p({ current: v })} />
                  <Field label="Grade or GPA" hint="Include the scale, for example 3.5 / 4.0."><TextInput value={x.grade} onValue={(v) => p({ grade: v })} /></Field>
                  <Field label="Honours and awards"><TextInput value={x.honours} onValue={(v) => p({ honours: v })} /></Field>
                  <Field label="Relevant coursework" wide hint="Separate with commas."><TextInput value={x.coursework} onValue={(v) => p({ coursework: v })} /></Field>
                </div>
              )} />
          </Section>

          <Section id="sec-skills" num="06" title="Skills and languages" desc="Type a skill and press Enter, or paste a comma-separated list. Order does not matter.">
            <TagInput label="Technical skills" values={e.skills.technical} onChange={setSkills('technical')} placeholder="For example: SQL, financial modelling" />
            <TagInput label="Tools and platforms" values={e.skills.tools} onChange={setSkills('tools')} placeholder="For example: Excel, Figma, Jira" />
            <TagInput label="Soft skills" values={e.skills.soft} onChange={setSkills('soft')} placeholder="For example: public speaking" />
            <Entries items={e.languages} onChange={setList('languages')} make={blank.language} noun="Language" titleOf={(x) => x.language}
              render={(x, p) => (
                <div className={grid}>
                  <Field label="Spoken language"><TextInput value={x.language} onValue={(v) => p({ language: v })} /></Field>
                  <Field label="Proficiency"><Select value={x.proficiency} onValue={(v) => p({ proficiency: v })} options={PROFICIENCY} placeholder="Select…" /></Field>
                </div>
              )} />
          </Section>

          <Section id="sec-certs" num="07" title="Certifications and licences" desc="Professional certificates, licences and short courses.">
            <Entries items={e.certifications} onChange={setList('certifications')} make={blank.certification} noun="Certification" titleOf={(x) => x.name}
              render={(x, p) => (
                <div className={grid}>
                  <Field label="Name"><TextInput value={x.name} onValue={(v) => p({ name: v })} /></Field>
                  <Field label="Issuing organization"><TextInput value={x.issuer} onValue={(v) => p({ issuer: v })} /></Field>
                  <Field label="Issue date"><DateInput value={x.issued} onValue={(v) => p({ issued: v })} /></Field>
                  <Field label="Expiry date"><DateInput value={x.expires} onValue={(v) => p({ expires: v })} /></Field>
                  <Field label="Credential ID or link" wide><TextInput value={x.credential} onValue={(v) => p({ credential: v })} /></Field>
                </div>
              )} />
          </Section>

          <Section id="sec-activities" num="08" title="Activities and extras" desc="Hackathons, volunteering, clubs, competitions, publications and awards.">
            <Entries items={e.activities} onChange={setList('activities')} make={blank.activity} noun="Activity" titleOf={(x) => x.title}
              render={(x, p) => (
                <div className={grid}>
                  <Field label="Type"><Select value={x.type} onValue={(v) => p({ type: v })} options={ACTIVITY_TYPES} placeholder="Select…" /></Field>
                  <Field label="Title"><TextInput value={x.title} onValue={(v) => p({ title: v })} /></Field>
                  <Field label="Organization"><TextInput value={x.organization} onValue={(v) => p({ organization: v })} /></Field>
                  <Field label="Location"><TextInput value={x.location} onValue={(v) => p({ location: v })} /></Field>
                  <Field label="Date"><DateInput value={x.date} onValue={(v) => p({ date: v })} /></Field>
                  <Field label="Details" wide hint="What was it and what was your part?"><TextArea rows={3} value={x.details} onValue={(v) => p({ details: v })} /></Field>
                </div>
              )} />
          </Section>

          <SaveBar dirty={doc.dirty} saving={doc.saving} onSave={save} note="Saved on this computer. Export or delete it any time in Settings.">
            <button type="button" className={btn.primary} disabled={doc.saving}
              onClick={async () => { if (doc.dirty) { try { await doc.save() } catch (err) { notify('Could not save: ' + (err as Error).message); return } } go('preferences') }}>
              {doc.dirty ? 'Save and continue →' : 'Continue to preferences →'}
            </button>
          </SaveBar>
        </div>

        <aside className="flex min-w-0 max-w-[25rem] flex-[1_1_18rem] flex-col gap-6 lg:sticky lg:top-6">
          <div className={cx(panel, 'p-5 shadow-hard')}>
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="m-0 font-display text-xl font-bold">Profile strength</h2>
              <span className="font-display text-xl font-bold">{pct}%</span>
            </div>
            <div className="mt-3.5 mb-4 h-5 border-2 border-ink bg-white" role="progressbar" aria-label="Profile strength" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
              <div className="h-full bg-accent transition-[width]" style={{ width: `${pct}%` }} />
            </div>
            <ul className="m-0 flex list-none flex-col gap-1 p-0">
              {checks.map((c) => (
                <li key={c.id}>
                  <button type="button" onClick={() => document.getElementById(c.id)?.scrollIntoView({ behavior: 'smooth' })}
                    className="flex w-full cursor-pointer items-center gap-2.5 border-0 bg-transparent py-1 text-left text-[15px] text-ink hover:underline">
                    <span className={cx('min-w-[3.9rem] flex-none border-2 border-ink px-1.5 py-0.5 text-center font-display text-[11px] font-semibold uppercase tracking-[0.05em]', c.done ? 'bg-ink text-white' : 'bg-white text-ink')}>
                      {c.done ? 'Done' : 'To do'}
                    </span>
                    {c.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>
          <div className="border-2 border-ink p-5">
            <h2 className="mt-0 mb-2.5 font-display text-xl font-bold">Why we ask</h2>
            <p className="mt-0 mb-2.5">Titles and dates help the model judge your experience level.</p>
            <p className="mt-0 mb-2.5">Skills and tools are compared with the wording in each posting.</p>
            <p className="m-0">No work history yet? Projects, volunteering and hackathons count just as much.</p>
          </div>
        </aside>
      </div>
    </>
  )
}
