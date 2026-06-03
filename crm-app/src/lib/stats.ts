import type { CRMRow } from '../parseTSV'
import {
  categorizeJob,
  type JobCategory,
  JOB_CATEGORIES,
} from './categorize'

export function weekStart(dateStr: string): string {
  if (!dateStr) return ''
  const d = new Date(dateStr + 'T00:00:00')
  if (isNaN(d.getTime())) return ''
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  return d.toISOString().slice(0, 10)
}

export function formatWeekLabel(weekStartStr: string): string {
  if (!weekStartStr) return ''
  const d = new Date(weekStartStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { day: '2-digit', month: 'short' })
}

export function daysSince(dateStr: string): number {
  if (!dateStr) return Infinity
  const d = new Date(dateStr + 'T00:00:00')
  if (isNaN(d.getTime())) return Infinity
  const now = new Date()
  return Math.floor((now.getTime() - d.getTime()) / 86400000)
}

export type Stats = {
  total: number
  totalCompanies: number
  totalCalls: number
  prospectsWithCall: number
  totalHot: number
  totalMid: number
  totalCold: number
  byCategory: Record<JobCategory, number>
  byFunnel: Record<string, number>
  byTemp: Record<string, number>
  bySource: Record<string, number>
  byCompany: Record<string, number>
  byWeek: Record<string, number>
  callsPerCategory: Record<JobCategory, number>
  matrix: { category: JobCategory; total: number; calls: number; hot: number; mid: number; cold: number }[]
}

export function computeStats(data: CRMRow[]): Stats {
  const byCategory = Object.fromEntries(JOB_CATEGORIES.map((c) => [c, 0])) as Record<
    JobCategory,
    number
  >
  const callsPerCategory = Object.fromEntries(JOB_CATEGORIES.map((c) => [c, 0])) as Record<
    JobCategory,
    number
  >
  const byFunnel: Record<string, number> = {}
  const byTemp: Record<string, number> = {}
  const bySource: Record<string, number> = {}
  const byCompany: Record<string, number> = {}
  const byWeek: Record<string, number> = {}
  const seenCompanies = new Set<string>()
  const matrixAcc: Record<
    JobCategory,
    { total: number; calls: number; hot: number; mid: number; cold: number }
  > = Object.fromEntries(
    JOB_CATEGORIES.map((c) => [c, { total: 0, calls: 0, hot: 0, mid: 0, cold: 0 }]),
  ) as never

  let totalCalls = 0
  let prospectsWithCall = 0

  data.forEach((r) => {
    const cat = categorizeJob(r['Job title'], r.Summary)
    byCategory[cat]++
    matrixAcc[cat].total++

    const calls = Number(r['Calls count']) || 0
    totalCalls += calls
    if (calls > 0) prospectsWithCall++
    callsPerCategory[cat] += calls
    matrixAcc[cat].calls += calls

    if (r._effective_funnel_stage) byFunnel[r._effective_funnel_stage] = (byFunnel[r._effective_funnel_stage] || 0) + 1

    if (r.Temperature) {
      byTemp[r.Temperature] = (byTemp[r.Temperature] || 0) + 1
      if (r.Temperature === 'Chaud') matrixAcc[cat].hot++
      else if (r.Temperature === 'Tiède') matrixAcc[cat].mid++
      else if (r.Temperature === 'Froid') matrixAcc[cat].cold++
    }

    const src = r.Source || 'Unknown'
    bySource[src] = (bySource[src] || 0) + 1

    if (r.Company) byCompany[r.Company] = (byCompany[r.Company] || 0) + 1

    // Company-level aggregations (dedup by company id)
    const co = r._company
    if (co && !seenCompanies.has(co.id)) {
      seenCompanies.add(co.id)
    }

    const ws = weekStart(r['Date added'])
    if (ws) byWeek[ws] = (byWeek[ws] || 0) + 1
  })

  const matrix = JOB_CATEGORIES.map((c) => ({
    category: c,
    total: matrixAcc[c].total,
    calls: matrixAcc[c].calls,
    hot: matrixAcc[c].hot,
    mid: matrixAcc[c].mid,
    cold: matrixAcc[c].cold,
  })).filter((m) => m.total > 0)

  return {
    total: data.length,
    totalCompanies: seenCompanies.size,
    totalCalls,
    prospectsWithCall,
    totalHot: byTemp['Chaud'] || 0,
    totalMid: byTemp['Tiède'] || 0,
    totalCold: byTemp['Froid'] || 0,
    byCategory,
    byFunnel,
    byTemp,
    bySource,
    byCompany,
    byWeek,
    callsPerCategory,
    matrix,
  }
}
