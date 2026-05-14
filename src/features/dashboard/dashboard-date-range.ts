import {
  endOfMonth,
  format,
  isAfter,
  isSameDay,
  isSameMonth,
  isSameYear,
  isValid,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subDays,
} from 'date-fns'

export type DashboardPeriodPreset = 'today' | 'yesterday' | 'week' | 'month' | 'custom'

export type DashboardDateRange = {
  fromStr: string
  toStr: string
  /** Torchlight `issue_date` filter */
  issueDateRange: string
  /** Torchlight expense payments `date` filter */
  expenseDateRange: string
  /** Short label for UI, e.g. "May 1–9, 2026" */
  subtitle: string
}

function ymd(d: Date): string {
  return format(d, 'yyyy-MM-dd')
}

function formatRangeSubtitle(from: Date, to: Date): string {
  if (isSameDay(from, to)) {
    return format(from, 'MMM d, yyyy')
  }
  if (isSameYear(from, to) && isSameMonth(from, to)) {
    return `${format(from, 'MMM d')}–${format(to, 'd, yyyy')}`
  }
  if (isSameYear(from, to)) {
    return `${format(from, 'MMM d')} – ${format(to, 'MMM d, yyyy')}`
  }
  return `${format(from, 'MMM d, yyyy')} – ${format(to, 'MMM d, yyyy')}`
}

function buildRange(from: Date, to: Date): DashboardDateRange {
  const fromStr = ymd(from)
  const toStr = ymd(to)
  return {
    fromStr,
    toStr,
    issueDateRange: `${fromStr} to ${toStr}`,
    expenseDateRange: `${fromStr} to ${toStr}`,
    subtitle: formatRangeSubtitle(startOfDay(from), startOfDay(to)),
  }
}

/** Presets only: today, yesterday, week (Mon–today), month (calendar). */
export function getDashboardDateRangeForPreset(
  preset: Exclude<DashboardPeriodPreset, 'custom'>,
  anchor: Date,
): DashboardDateRange {
  const day = startOfDay(anchor)
  switch (preset) {
    case 'today':
      return buildRange(day, day)
    case 'yesterday': {
      const y = subDays(day, 1)
      return buildRange(y, y)
    }
    case 'week': {
      const weekStart = startOfWeek(day, { weekStartsOn: 1 })
      return buildRange(weekStart, day)
    }
    case 'month':
    default: {
      const ms = startOfMonth(day)
      const me = endOfMonth(day)
      return buildRange(ms, me)
    }
  }
}

export function buildCustomDashboardDateRange(
  fromStr: string,
  toStr: string,
): DashboardDateRange | null {
  const from = parseISO(fromStr.trim())
  const to = parseISO(toStr.trim())
  if (!isValid(from) || !isValid(to)) return null
  const fd = startOfDay(from)
  const td = startOfDay(to)
  if (isAfter(fd, td)) return null
  return buildRange(fd, td)
}

/** Resolves the range shown on the dashboard; falls back to current month if custom is incomplete. */
export function resolveDashboardDateRange(
  preset: DashboardPeriodPreset,
  custom: { fromStr: string; toStr: string } | null,
  anchor: Date,
): DashboardDateRange {
  if (preset === 'custom' && custom?.fromStr && custom?.toStr) {
    const built = buildCustomDashboardDateRange(custom.fromStr, custom.toStr)
    if (built) return built
  }
  if (preset === 'custom') {
    return getDashboardDateRangeForPreset('month', anchor)
  }
  return getDashboardDateRangeForPreset(preset, anchor)
}
