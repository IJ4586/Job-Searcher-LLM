// Class-name recipes for the brutalist design. Kept out of ui.tsx so that file
// only exports components (keeps React Fast Refresh happy).

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ')

export const labelText = 'font-display text-xs font-semibold uppercase tracking-[0.06em]'

export const inputCls =
  'w-full min-w-0 h-12 border-2 border-ink bg-white px-3.5 text-base text-ink placeholder:text-subtle disabled:bg-panel disabled:text-subtle'

export const textareaCls =
  'w-full min-w-0 border-2 border-ink bg-white px-3.5 py-3 text-base leading-relaxed text-ink placeholder:text-subtle resize-y'

const btnBase =
  'inline-flex items-center justify-center gap-2 min-h-12 px-5 border-2 font-display text-[15px] font-bold leading-tight text-center no-underline cursor-pointer select-none transition-[transform,box-shadow] disabled:cursor-not-allowed disabled:opacity-50'

export const btn = {
  primary: cx(btnBase, 'border-ink bg-accent text-ink shadow-hard-sm hover:not-disabled:-translate-x-px hover:not-disabled:-translate-y-px hover:not-disabled:shadow-[5px_5px_0_0_#0b0b0b] active:not-disabled:translate-x-[3px] active:not-disabled:translate-y-[3px] active:not-disabled:shadow-none'),
  dark: cx(btnBase, 'border-ink bg-ink text-white hover:not-disabled:bg-body'),
  outline: cx(btnBase, 'border-ink bg-white text-ink hover:not-disabled:bg-panel'),
  ghost: cx(btnBase, 'border-ink bg-transparent text-ink font-semibold hover:not-disabled:bg-white'),
  danger: cx(btnBase, 'border-danger bg-danger text-white hover:not-disabled:bg-[#8a0015]'),
  onDark: cx(btnBase, 'border-white bg-white text-ink hover:not-disabled:bg-panel'),
  accentOnDark: cx(btnBase, 'border-white bg-accent text-ink'),
}

export const panel = 'border-2 border-ink bg-panel'
export const grid = 'grid gap-5 grid-cols-[repeat(auto-fill,minmax(min(100%,15rem),1fr))]'
