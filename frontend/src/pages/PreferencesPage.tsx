import type { Preferences } from '../api'
import type { Notify, Route } from '../App'
import type { Doc } from '../store'
import { btn, cx, grid, inputCls, labelText, panel } from '../styles'
import { Check, Chip, ChipGroup, Field, PageHero, SaveBar, Section, Select, Spinner, TagInput, TextInput } from '../ui'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const
const SHIFTS = ['Day', 'Evening', 'Overnight', 'Weekend', 'Rotating'] as const
const TYPES = ['Full-time', 'Part-time', 'Contract', 'Temporary', 'Internship', 'Co-op'] as const
const BENEFITS = ['Health and dental', 'Paid time off', 'Retirement match', 'Learning budget', 'Flexible schedule', 'Equity', 'Parental leave'] as const
const SETTINGS = ['Remote', 'Hybrid', 'On-site'] as const
const RELOCATION = ['Not open', 'Within my region', 'Within my country', 'Anywhere'] as const
const LIMITS = [10, 25, 50, 100]
const HOURS = Array.from({ length: 19 }, (_, i) => `${String(i + 5).padStart(2, '0')}:00`)
const TITLE_IDEAS = ['Project Coordinator', 'Data Analyst', 'Business Analyst', 'Operations Associate', 'Junior Product Manager', 'Marketing Coordinator', 'Customer Success Associate', 'Junior Software Developer']

const estimate = (limit: number) => {
  // Roughly 20–30 s per batch of five postings on a typical laptop model, plus fetching.
  const mins = Math.max(1, Math.round((Math.ceil(limit / 5) * 25 + 15) / 60))
  return mins >= 60 ? `about ${Math.floor(mins / 60)} h ${mins % 60} min` : `about ${mins} min`
}

export default function PreferencesPage({ doc, notify, go, runSearch, searching }: {
  doc: Doc<Preferences>; notify: Notify; go: (r: Route) => void; runSearch: () => void; searching: boolean
}) {
  const p = doc.data
  const set = <K extends keyof Preferences>(k: K, v: Preferences[K]) => doc.set((d) => ({ ...d, [k]: v }))
  const setHome = (k: keyof Preferences['home']) => (v: string) => doc.set((d) => ({ ...d, home: { ...d.home, [k]: v } }))
  const num = (v: string) => (v === '' ? null : Math.max(0, Number(v)))
  const per = p.pay_basis === 'hourly' ? 'per hour' : 'per year'
  const payWarn = p.min_pay != null && p.target_pay != null && p.min_pay > p.target_pay

  const save = async () => {
    try { await doc.save(); notify('Preferences saved.') } catch (err) { notify('Could not save: ' + (err as Error).message) }
  }

  const summary: [string, string][] = [
    ['Roles', p.titles.length ? `${p.titles.length} of 10` : 'None yet'],
    ['Days', p.days.length ? `${p.days.length} per week` : 'Any'],
    ['Type', p.employment_types.join(', ') || 'Any'],
    ['Pay', p.min_pay != null ? `${p.currency} ${p.min_pay.toLocaleString()} ${p.pay_basis === 'hourly' ? '/h' : '/yr'} min` : 'Not set'],
    ['Setting', p.work_settings.join(', ') || 'Any'],
    ['Commute', p.max_commute >= 120 ? '120+ min' : `${p.max_commute} min max`],
    ['Limit', `${p.posting_limit} postings`],
  ]
  const canSearch = p.titles.length > 0

  const searchButton = (full?: boolean) => (
    <button type="button" className={cx(btn.primary, full && 'w-full')} disabled={!canSearch || searching || doc.saving} onClick={runSearch}>
      {searching && <Spinner />}{searching ? 'Searching…' : `Save and search ${p.posting_limit} postings →`}
    </button>
  )

  return (
    <>
      <PageHero step={2} title="Job preferences" tag="Set up your search"
        intro="Say what you are looking for. CareerCue scores every posting against this and tells you why each one fits or does not." />

      <div className="flex flex-wrap items-start gap-10 pt-12 pb-16">
        <div className="min-w-0 flex-[999_1_34rem]">
          <Section num="01" title="Target job titles" desc="Add up to 10 specific roles, for example Project Manager or Data Analyst. Each one is searched separately.">
            <TagInput label="Role title" values={p.titles} onChange={(v) => set('titles', v)} max={10} addLabel="Add role"
              placeholder="Type a role and press Enter" suggestions={TITLE_IDEAS} />
            {!p.titles.length && <p className="m-0 text-body">Add at least one role to start a search.</p>}
          </Section>

          <Section num="02" title="Work schedule and job types" desc="The days and hours you can work, and the kinds of employment you will consider.">
            <ChipGroup label="Days" options={DAYS} value={p.days} onChange={(v) => set('days', v as string[])} />
            <div className={grid}>
              <Field label="Earliest start of day"><Select value={p.hours_start} onValue={(v) => set('hours_start', v)} options={HOURS} /></Field>
              <Field label="Latest end of day"><Select value={p.hours_end} onValue={(v) => set('hours_end', v)} options={HOURS} /></Field>
              <div className="flex items-end"><Check label="Flexible hours are fine" checked={p.flexible_hours} onChange={(v) => set('flexible_hours', v)} /></div>
            </div>
            <ChipGroup label="Shift type" options={SHIFTS} value={p.shifts} onChange={(v) => set('shifts', v as string[])} />
            <ChipGroup label="Employment type" options={TYPES} value={p.employment_types} onChange={(v) => set('employment_types', v as string[])} />
          </Section>

          <Section num="03" title="Compensation" desc="Your floor and your target. Postings below your floor rank lower. Nothing is hidden silently.">
            <ChipGroup label="Pay basis" options={[{ value: 'annual', label: 'Annual salary' }, { value: 'hourly', label: 'Hourly' }]}
              value={p.pay_basis} onChange={(v) => set('pay_basis', v as Preferences['pay_basis'])} />
            <div className={grid}>
              <Field label="Currency"><Select value={p.currency} onValue={(v) => set('currency', v)} options={['CAD', 'USD', 'EUR', 'GBP', 'AUD']} /></Field>
              <Field label="Minimum pay" aside={per}><TextInput type="number" inputMode="decimal" min={0} value={p.min_pay ?? ''} onValue={(v) => set('min_pay', num(v))} /></Field>
              <Field label="Target pay" aside={per} hint={payWarn ? 'Target is below your minimum.' : undefined}>
                <TextInput type="number" inputMode="decimal" min={0} value={p.target_pay ?? ''} onValue={(v) => set('target_pay', num(v))} />
              </Field>
            </div>
            <Check label="Include postings that do not list pay" checked={p.include_unlisted_pay} onChange={(v) => set('include_unlisted_pay', v)} />
            <ChipGroup label="Benefits that matter" options={BENEFITS} value={p.benefits} onChange={(v) => set('benefits', v as string[])} />
          </Section>

          <Section num="04" title="Location and setting" desc="Where you will work, how you get there and whether you would move.">
            <ChipGroup label="Work setting" options={SETTINGS} value={p.work_settings} onChange={(v) => set('work_settings', v as string[])}
              hint={p.work_settings.length ? undefined : 'None selected means any setting.'} />
            <TagInput label="Work areas" values={p.work_areas} onChange={(v) => set('work_areas', v)} max={3} addLabel="Add area"
              placeholder="A city, district or neighbourhood" />
            <div className={grid}>
              <Field label="Maximum commute" aside={<strong className="font-display text-sm text-ink">{p.max_commute >= 120 ? '120+ min' : `${p.max_commute} min`}</strong>}>
                <input type="range" min={5} max={120} step={5} value={p.max_commute} onChange={(e) => set('max_commute', Number(e.target.value))} className="m-0 h-12 w-full" />
              </Field>
              <Field label="How you travel"><Select value={p.travel_mode} onValue={(v) => set('travel_mode', v)} options={['Public transit', 'Car', 'Bike', 'Walking']} /></Field>
            </div>
            <ChipGroup label="Open to relocating" options={RELOCATION} value={p.relocation} onChange={(v) => set('relocation', v as string)} />
            <div className="max-w-[22.5rem]">
              <Field label="Work authorization" hint="Helps the model flag postings you cannot take.">
                <Select value={p.work_authorization} onValue={(v) => set('work_authorization', v)} placeholder="Prefer not to say"
                  options={['Citizen', 'Permanent resident', 'Work permit', 'Study permit', 'Need sponsorship']} />
              </Field>
            </div>
          </Section>

          <Section num="05" title="Availability" desc="When you can start. Students and new grads: add your graduation date so internships and graduate programs rank properly.">
            <div className={grid}>
              <Field label="Available from"><TextInput type="date" value={p.available_from} onValue={(v) => set('available_from', v)} /></Field>
              <Field label="Notice period"><Select value={p.notice_period} onValue={(v) => set('notice_period', v)} options={['Immediately', '1 week', '2 weeks', '1 month', '2 months or more']} /></Field>
              <Field label="Graduation date" aside="Optional"><TextInput type="month" value={p.graduation} onValue={(v) => set('graduation', v)} /></Field>
            </div>
            <div className="flex flex-col">
              <Check label="I am open to internships and co-op terms" checked={p.open_to_internships} onChange={(v) => set('open_to_internships', v)} />
              <Check label="I can start right away if the role is a fit" checked={p.start_immediately} onChange={(v) => set('start_immediately', v)} />
            </div>
          </Section>

          <Section num="06" title="Your home base" desc="Where you live now. Job Bank searches near this city, and the model uses it to judge commutes. It never leaves your computer except as the search location.">
            <div className={grid}>
              <Field label="Country"><TextInput value={p.home.country} onValue={setHome('country')} autoComplete="country-name" /></Field>
              <Field label="Province or state"><TextInput value={p.home.region} onValue={setHome('region')} autoComplete="address-level1" placeholder="For example: ON" /></Field>
              <Field label="City"><TextInput value={p.home.city} onValue={setHome('city')} autoComplete="address-level2" /></Field>
              <Field label="District or neighbourhood" aside="Optional"><TextInput value={p.home.district} onValue={setHome('district')} /></Field>
              <Field label="Postal or ZIP code" aside="Optional"><TextInput value={p.home.postal} onValue={setHome('postal')} autoComplete="postal-code" /></Field>
            </div>
          </Section>

          <Section num="07" title="How many postings?" desc="Set a cap. The model scores every posting it reads, so a smaller number finishes sooner.">
            <div className={cx(panel, 'flex flex-col gap-5 p-5 shadow-hard')}>
              <div className="flex flex-wrap items-end gap-5">
                <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
                  <legend className={cx(labelText, 'mb-2 p-0')}>Posting limit</legend>
                  <div className="flex flex-wrap gap-2">
                    {LIMITS.map((n) => <Chip key={n} on={p.posting_limit === n} onClick={() => set('posting_limit', n)}>{n}</Chip>)}
                  </div>
                </fieldset>
                <label className="flex w-36 flex-col gap-1.5">
                  <span className={labelText}>Custom</span>
                  <input type="number" min={1} max={500} className={inputCls} value={p.posting_limit}
                    onChange={(e) => set('posting_limit', Math.max(1, Math.min(500, Number(e.target.value) || 1)))} />
                </label>
              </div>
              <p className="m-0 text-body">Rough time: <strong>{estimate(p.posting_limit)}</strong>. It depends on your computer and the model you picked.</p>
              <Check label="Skip postings I have already seen" checked={p.skip_seen} onChange={(v) => set('skip_seen', v)} />
            </div>
          </Section>

          <SaveBar dirty={doc.dirty} saving={doc.saving} onSave={save} note="Saved. Run a search whenever you are ready.">
            {searchButton()}
          </SaveBar>
        </div>

        <aside className="flex min-w-0 max-w-[25rem] flex-[1_1_18rem] flex-col gap-6 lg:sticky lg:top-6">
          <div className={cx(panel, 'p-5 shadow-hard')}>
            <h2 className="mt-0 mb-3.5 font-display text-xl font-bold">Search summary</h2>
            <dl className="m-0 flex flex-col">
              {summary.map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 border-t-2 border-ink py-2.5">
                  <dt className={cx(labelText, 'pt-0.5')}>{k}</dt>
                  <dd className="m-0 min-w-0 text-right font-medium">{v}</dd>
                </div>
              ))}
            </dl>
            <div className="mt-4">{searchButton(true)}</div>
            {!canSearch && <p className="mt-3 mb-0 text-sm text-body">Add a target role first.</p>}
          </div>
          <div className="border-2 border-ink p-5">
            <h2 className="mt-0 mb-2.5 font-display text-xl font-bold">Not sure yet?</h2>
            <p className="m-0">Start broad. You can tighten things after the first results. With "skip seen" on, rerunning only scores new postings.</p>
            <button type="button" className={cx(btn.ghost, 'mt-4 min-h-10 text-sm')} onClick={() => go('postings')}>See current postings</button>
          </div>
        </aside>
      </div>
    </>
  )
}
