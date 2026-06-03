import type { ReactNode } from 'react'

export const tempColors: Record<string, string> = {
  Chaud: 'bg-red-100 text-red-800 ring-red-200',
  Tiède: 'bg-amber-100 text-amber-800 ring-amber-200',
  Froid: 'bg-sky-100 text-sky-800 ring-sky-200',
}

export const funnelStageColors: Record<string, string> = {
  'Premier contact': 'bg-zinc-100 text-zinc-700 ring-zinc-200',
  Démo: 'bg-amber-100 text-amber-800 ring-amber-200',
  Négociation: 'bg-orange-100 text-orange-800 ring-orange-200',
  Signé: 'bg-emerald-100 text-emerald-800 ring-emerald-200',
  Perdu: 'bg-red-100 text-red-800 ring-red-200',
}

export const industryColors: Record<string, string> = {
  SaaS: 'bg-blue-100 text-blue-800 ring-blue-200',
  'AI / ML': 'bg-violet-100 text-violet-800 ring-violet-200',
  'Marketing & Growth': 'bg-rose-100 text-rose-800 ring-rose-200',
  'HR Tech': 'bg-orange-100 text-orange-800 ring-orange-200',
  FinTech: 'bg-amber-100 text-amber-800 ring-amber-200',
  LegalTech: 'bg-slate-100 text-slate-800 ring-slate-200',
  Healthcare: 'bg-teal-100 text-teal-800 ring-teal-200',
  EdTech: 'bg-cyan-100 text-cyan-800 ring-cyan-200',
  Consulting: 'bg-yellow-100 text-yellow-800 ring-yellow-200',
  'E-commerce': 'bg-pink-100 text-pink-800 ring-pink-200',
  Manufacturing: 'bg-stone-100 text-stone-800 ring-stone-200',
  Other: 'bg-zinc-100 text-zinc-600 ring-zinc-200',
}

export function Badge({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${
        className ?? 'bg-zinc-50 text-zinc-700 ring-zinc-200'
      }`}
    >
      {children}
    </span>
  )
}
