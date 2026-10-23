import { useId, useState, type ReactNode } from 'react'
import { btn, cx, inputCls, labelText, textareaCls } from './styles'

/* ---------- Page structure ---------- */

export function PageHero({ step, title, intro, tag }: { step: number; title: string; intro: string; tag: string }) {
  return (
    <div className="flex flex-wrap border-b border-ink">
      <div className="flex min-w-0 flex-[2_1_22rem] flex-col justify-center py-7 pr-6">
        <h1 className="m-0 font-display text-[clamp(2rem,6vw,2.75rem)] font-bold leading-[1.05] tracking-[-0.03em]">{title}</h1>
        <p className="mt-3 mb-0 max-w-[38rem] text-[17px] text-body">{intro}</p>
      </div>
      <div className="flex min-h-[6.5rem] flex-[1_1_16rem] flex-col justify-between gap-3 bg-accent px-6 py-5">
        <span className={cx(labelText, 'tracking-[0.08em]')}>Step {step} of 4</span>
        <span className="font-display text-[28px] font-bold leading-[1.1] tracking-[-0.02em]">{tag}</span>
      </div>
    </div>
  )
}

export function Section({ num, title, desc, children, id }: { num: string; title: string; desc?: ReactNode; children: ReactNode; id?: string }) {
  const hid = useId()
  return (
    <section id={id} aria-labelledby={hid} className="mb-14 scroll-mt-6 border-t-4 border-ink">
      <header className="flex items-start gap-4 pt-5 pb-6 sm:gap-5">
        <span aria-hidden="true" className="flex h-12 min-w-12 flex-none items-center justify-center bg-accent font-display text-xl font-bold sm:h-14 sm:min-w-14 sm:text-[22px]">{num}</span>
        <div className="min-w-0">
          <h2 id={hid} className="m-0 font-display text-[clamp(1.375rem,4vw,1.75rem)] font-bold leading-[1.15] tracking-[-0.02em]">{title}</h2>
          {desc && <p className="mt-1.5 mb-0 max-w-[38rem] text-body">{desc}</p>}
        </div>
      </header>
      <div className="flex flex-col gap-6">{children}</div>
    </section>
  )
}

export function Card({ title, onRemove, children }: { title: string; onRemove?: () => void; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-5 border-2 border-ink bg-panel p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <h3 className="m-0 font-display text-lg font-bold">{title}</h3>
        {onRemove && <button type="button" onClick={onRemove} className={cx(btn.outline, 'min-h-10 px-4 text-sm')}>Remove</button>}
      </div>
      {children}
    </div>
  )
}

/* ---------- Form controls ---------- */

export function Field({ label, hint, aside, wide, children }: { label: string; hint?: ReactNode; aside?: ReactNode; wide?: boolean; children: ReactNode }) {
  return (
    <label className={cx('flex min-w-0 flex-col gap-1.5', wide && 'col-span-full')}>
      <span className="flex items-baseline justify-between gap-2">
        <span className={labelText}>{label}</span>
        {aside && <span className="text-xs text-subtle">{aside}</span>}
      </span>
      {children}
      {hint && <span className="text-[13px] text-subtle">{hint}</span>}
    </label>
  )
}

type InputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> & { value: string | number; onValue: (v: string) => void }
export function TextInput({ value, onValue, className, ...rest }: InputProps) {
  return <input {...rest} className={cx(inputCls, className)} value={value} onChange={(e) => onValue(e.target.value)} />
}

/** Month picker when the value is YYYY-MM (or empty); plain text otherwise so
 *  year-only dates from imported resumes are not hidden. */
export function DateInput({ value, onValue, ...rest }: Omit<InputProps, 'type'> & { value: string }) {
  const month = value === '' || /^\d{4}-\d{2}$/.test(value)
  return <TextInput {...rest} type={month ? 'month' : 'text'} placeholder={month ? undefined : 'YYYY-MM'} value={value} onValue={onValue} />
}

export function TextArea({ value, onValue, rows = 4, placeholder, maxLength }: { value: string; onValue: (v: string) => void; rows?: number; placeholder?: string; maxLength?: number }) {
  return <textarea className={textareaCls} rows={rows} placeholder={placeholder} maxLength={maxLength} value={value} onChange={(e) => onValue(e.target.value)} />
}

export function Select({ value, onValue, options, placeholder }: { value: string; onValue: (v: string) => void; options: (string | { value: string; label: string })[]; placeholder?: string }) {
  const opts = options.map((o) => (typeof o === 'string' ? { value: o, label: o } : o))
  const known = value === '' || opts.some((o) => o.value === value)
  return (
    <select className={cx(inputCls, 'px-2.5')} value={value} onChange={(e) => onValue(e.target.value)}>
      {placeholder !== undefined && <option value="">{placeholder}</option>}
      {!known && <option value={value}>{value}</option>}
      {opts.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  )
}

export function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex min-h-12 cursor-pointer items-center gap-2.5 self-start">
      <input type="checkbox" className="m-0 size-[22px] flex-none" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="font-medium">{label}</span>
    </label>
  )
}

/* ---------- Chips ---------- */

export function Chip({ on, onClick, children, small }: { on: boolean; onClick: () => void; children: ReactNode; small?: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={cx(
        'cursor-pointer border-2 border-ink px-4 font-display font-semibold transition-colors',
        small ? 'min-h-10 text-sm' : 'min-h-11 text-[15px]',
        on ? 'bg-ink text-white' : 'bg-white text-ink hover:bg-panel',
      )}
    >
      {children}
    </button>
  )
}

export function ChipGroup<T extends string>({ label, options, value, onChange, small, hint }: {
  label: string
  options: readonly T[] | { value: T; label: string }[]
  value: T | T[]
  onChange: (v: T | T[]) => void
  small?: boolean
  hint?: ReactNode
}) {
  const opts = (options as (T | { value: T; label: string })[]).map((o) => (typeof o === 'string' ? { value: o, label: o } : o))
  const multi = Array.isArray(value)
  const isOn = (v: T) => (multi ? (value as T[]).includes(v) : value === v)
  const pick = (v: T) => {
    if (!multi) return onChange(v)
    const arr = value as T[]
    onChange(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v])
  }
  return (
    <fieldset className="m-0 flex min-w-0 flex-col gap-2 border-0 p-0">
      <legend className={cx(labelText, 'mb-2 p-0')}>{label}</legend>
      <div className="flex flex-wrap gap-2">
        {opts.map((o) => <Chip key={o.value} small={small} on={isOn(o.value)} onClick={() => pick(o.value)}>{o.label}</Chip>)}
      </div>
      {hint && <span className="text-sm text-body">{hint}</span>}
    </fieldset>
  )
}

/** Free-text tags: type and press Enter. Optional max and suggestion list. */
export function TagInput({ label, values, onChange, max, placeholder, addLabel = 'Add', suggestions, hint }: {
  label: string
  values: string[]
  onChange: (v: string[]) => void
  max?: number
  placeholder?: string
  addLabel?: string
  suggestions?: string[]
  hint?: ReactNode
}) {
  const [draft, setDraft] = useState('')
  const id = useId()
  const full = max !== undefined && values.length >= max
  const add = (raw: string) => {
    const parts = raw.split(/[,\n]/).map((s) => s.trim()).filter(Boolean)
    if (!parts.length) return
    const next = [...values]
    for (const p of parts) {
      if (max !== undefined && next.length >= max) break
      if (!next.some((x) => x.toLowerCase() === p.toLowerCase())) next.push(p)
    }
    onChange(next)
    setDraft('')
  }
  const remaining = (suggestions ?? []).filter((s) => !values.some((v) => v.toLowerCase() === s.toLowerCase())).slice(0, 6)
  return (
    <div className="flex min-w-0 flex-col gap-3">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex min-w-0 flex-[1_1_16rem] flex-col gap-1.5">
          <span className="flex items-baseline justify-between gap-2">
            <label htmlFor={id} className={labelText}>{label}</label>
            {max !== undefined && <span className="text-xs text-subtle" aria-live="polite">{values.length} / {max}</span>}
          </span>
          <input
            id={id}
            className={inputCls}
            value={draft}
            disabled={full}
            placeholder={full ? `Limit of ${max} reached` : placeholder}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { e.preventDefault(); add(draft) }
              if (e.key === 'Backspace' && !draft && values.length) onChange(values.slice(0, -1))
            }}
            onBlur={() => draft.includes(',') && add(draft)}
          />
        </div>
        <button type="button" className={btn.dark} disabled={full || !draft.trim()} onClick={() => add(draft)}>{addLabel}</button>
      </div>
      {hint && <span className="text-[13px] text-subtle">{hint}</span>}
      {values.length > 0 && (
        <ul className="m-0 flex list-none flex-wrap gap-2.5 p-0">
          {values.map((v, i) => (
            <li key={v + i} className="inline-flex min-h-11 max-w-full items-center bg-ink pl-3.5 font-display text-[15px] font-semibold text-white">
              <span className="truncate py-2">{v}</span>
              <button type="button" aria-label={`Remove ${v}`} onClick={() => onChange(values.filter((_, j) => j !== i))}
                className="ml-3 flex size-11 flex-none cursor-pointer items-center justify-center border-0 bg-accent font-display text-xl font-bold text-ink">×</button>
            </li>
          ))}
        </ul>
      )}
      {remaining.length > 0 && !full && (
        <div className="flex flex-wrap items-center gap-2">
          <span className={cx(labelText, 'mr-1')}>Suggested</span>
          {remaining.map((s) => (
            <button key={s} type="button" onClick={() => add(s)}
              className="min-h-9 cursor-pointer border-2 border-dashed border-ink bg-transparent px-3 font-display text-sm font-semibold hover:bg-white">+ {s}</button>
          ))}
        </div>
      )}
    </div>
  )
}

/* ---------- Toggle switch ---------- */

export function Toggle({ label, desc, on, onChange }: { label: string; desc?: ReactNode; on: boolean; onChange: (v: boolean) => void }) {
  const id = useId()
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0">
        <div id={id} className="font-semibold">{label}</div>
        {desc && <div className="text-sm text-body">{desc}</div>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-labelledby={id}
        onClick={() => onChange(!on)}
        className={cx('flex h-[34px] w-[60px] flex-none cursor-pointer items-center border-2 border-ink p-[3px] transition-colors', on ? 'justify-end bg-accent' : 'justify-start bg-white')}
      >
        <span className="size-[22px] bg-ink" />
      </button>
    </div>
  )
}

/* ---------- Misc ---------- */

export function Spinner({ light }: { light?: boolean }) {
  return <span aria-hidden="true" className={cx('spin inline-block size-4 border-2 border-t-transparent', light ? 'border-white' : 'border-ink')} />
}

export function Dot({ tone }: { tone: 'ok' | 'warn' | 'bad' }) {
  const c = tone === 'ok' ? 'bg-ok' : tone === 'warn' ? 'bg-warn' : 'bg-danger'
  return <span aria-hidden="true" className={cx('inline-block size-2.5 flex-none', c)} />
}

export function SaveBar({ dirty, saving, onSave, children, note }: { dirty: boolean; saving: boolean; onSave: () => void; children?: ReactNode; note?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-4 border-t-[10px] border-ink pt-6">
      <span className="max-w-[24rem] text-sm text-body" aria-live="polite">{dirty ? 'You have unsaved changes.' : note}</span>
      <div className="flex flex-wrap gap-4">
        <button type="button" className={btn.outline} disabled={saving || !dirty} onClick={onSave}>
          {saving && <Spinner />}{saving ? 'Saving…' : dirty ? 'Save' : 'Saved'}
        </button>
        {children}
      </div>
    </div>
  )
}
