export type JobCategory =
  | 'Founder'
  | 'GTM'
  | 'Sales'
  | 'Product'
  | 'Marketing'
  | 'VC'
  | 'Finance'
  | 'Ops'
  | 'Data / BI'
  | 'Tech'
  | 'Recruiting'
  | 'Student'
  | 'Other'

export const JOB_CATEGORIES: JobCategory[] = [
  'Founder',
  'GTM',
  'Sales',
  'Product',
  'Marketing',
  'VC',
  'Finance',
  'Ops',
  'Data / BI',
  'Tech',
  'Recruiting',
  'Student',
  'Other',
]

export function categorizeJob(jobTitle: string, recap = ''): JobCategory {
  const source = jobTitle.trim() || recap
  const t = source.toLowerCase()

  if (/(student|intern)/.test(t)) return 'Student'
  if (/\b(founder|co-founder|cofounder|ceo|cto|entrepreneur)\b/.test(t))
    return 'Founder'
  if (/\b(vc|venture|gp investor|\binvestor\b|angel|impact vc)\b/.test(t)) return 'VC'
  if (
    /\b(banker|banking|m&a|merger|investment analyst|investment banker|capital markets|private equity|\bpe\b|finance analyst|financial analyst)\b/.test(
      t,
    )
  )
    return 'Finance'
  if (/\b(talent acquisition|rpo|recruiter|recruiting|head of talent)\b/.test(t))
    return 'Recruiting'
  if (/\b(gtm|go-to-market|growth|revops|head of growth)\b/.test(t)) return 'GTM'
  if (
    /\b(sales|business develop|sdr|account executive|sales engineer|head of business|business development)\b/.test(
      t,
    )
  )
    return 'Sales'
  if (/\b(product manager|product owner|head of product|cpo|senior product)\b/.test(t))
    return 'Product'
  if (
    /\b(marketing|cmo|\bseo\b|content marketing|marketing head|growth marketing|performance marketing)\b/.test(
      t,
    )
  )
    return 'Marketing'
  if (
    /\b(operations|\bops\b|operations leader|head of operations|chief operating officer|\bcoo\b|operations manager|strategy & operations|strategy and operations)\b/.test(
      t,
    )
  )
    return 'Ops'
  if (
    /\b(data scientist|data analyst|business intelligence|\bbi\b|data consultant|data integrator|data applications)\b/.test(
      t,
    )
  )
    return 'Data / BI'
  if (
    /\b(software|engineer|developer|ux designer|front-end|backend|full-stack)\b/.test(t)
  )
    return 'Tech'

  return 'Other'
}

export const categoryColors: Record<JobCategory, string> = {
  Founder: 'bg-violet-100 text-violet-800 ring-violet-200',
  GTM: 'bg-cyan-100 text-cyan-800 ring-cyan-200',
  Sales: 'bg-blue-100 text-blue-800 ring-blue-200',
  Product: 'bg-fuchsia-100 text-fuchsia-800 ring-fuchsia-200',
  Marketing: 'bg-rose-100 text-rose-800 ring-rose-200',
  VC: 'bg-pink-100 text-pink-800 ring-pink-200',
  Finance: 'bg-amber-100 text-amber-800 ring-amber-200',
  Ops: 'bg-slate-100 text-slate-800 ring-slate-200',
  'Data / BI': 'bg-teal-100 text-teal-800 ring-teal-200',
  Tech: 'bg-indigo-100 text-indigo-800 ring-indigo-200',
  Recruiting: 'bg-orange-100 text-orange-800 ring-orange-200',
  Student: 'bg-zinc-100 text-zinc-700 ring-zinc-200',
  Other: 'bg-zinc-50 text-zinc-500 ring-zinc-200',
}

export const categoryBarColors: Record<JobCategory, string> = {
  Founder: 'bg-violet-500',
  GTM: 'bg-cyan-500',
  Sales: 'bg-blue-500',
  Product: 'bg-fuchsia-500',
  Marketing: 'bg-rose-500',
  VC: 'bg-pink-500',
  Finance: 'bg-amber-500',
  Ops: 'bg-slate-500',
  'Data / BI': 'bg-teal-500',
  Tech: 'bg-indigo-500',
  Recruiting: 'bg-orange-500',
  Student: 'bg-zinc-400',
  Other: 'bg-zinc-300',
}
