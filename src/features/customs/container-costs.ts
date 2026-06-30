/** VAT applied to storage removal and daily storage charges (not flat storage add-on on day 8). */
export const STORAGE_VAT_RATE = 0.18

/** Free days after discharge before demurrage begins. */
export const DEMURRAGE_FREE_DAYS = 14

export type ContainerSizeClass = '20ft' | '40ft'
export type StorageFacility = 'icd' | 'port'

export type ContainerCostInput = {
  containerType: string
  dischargeDate: string
  carryingDate: string
  storageFacility: StorageFacility
  gateOutDate: string
  returnedDate: string
  asOfDate?: string
}

export type AccrualStatus = 'missing_dates' | 'free' | 'accruing' | 'stopped'

export type CostAccrual = {
  status: AccrualStatus
  totalUsd: number
  chargeableDays: number
  currentDailyUsd: number | null
  summary: string
}

export type ContainerCostBreakdown = {
  sizeClass: ContainerSizeClass
  demurrage: CostAccrual
  storage: CostAccrual
}

export function classifyContainerSize(type: string): ContainerSizeClass {
  const normalized = type.trim().toUpperCase()
  if (normalized.startsWith('40') || normalized.includes('40')) return '40ft'
  if (normalized.startsWith('20') || normalized.includes('20')) return '20ft'
  return '20ft'
}

export function storageGraceDays(facility: StorageFacility): number {
  return facility === 'icd' ? 7 : 5
}

export function parseIsoDate(value: string): Date | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed)
  if (!match) return null
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const date = new Date(year, month - 1, day)
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null
  }
  return date
}

/** Inclusive day number where carrying/discharge date is day 1. */
export function inclusiveDayNumber(from: string, to: string): number | null {
  const start = parseIsoDate(from)
  const end = parseIsoDate(to)
  if (!start || !end) return null
  const msPerDay = 24 * 60 * 60 * 1000
  const diff = Math.floor((end.getTime() - start.getTime()) / msPerDay)
  return diff + 1
}

function withVat(amount: number): number {
  return amount * (1 + STORAGE_VAT_RATE)
}

function roundUsd(amount: number): number {
  return Math.round(amount * 100) / 100
}

function demurrageDailyRate(demurrageDay: number, size: ContainerSizeClass): number {
  if (demurrageDay <= 0) return 0
  if (demurrageDay <= 7) return size === '40ft' ? 20 : 10
  if (demurrageDay <= 14) return size === '40ft' ? 30 : 15
  return size === '40ft' ? 60 : 30
}

function storageChargeForDay(
  dayNumber: number,
  size: ContainerSizeClass,
  facility: StorageFacility
): number {
  const grace = storageGraceDays(facility)
  if (dayNumber <= grace) return 0

  const removalDay = grace + 1
  const tier2Start = grace + 2
  const tier2End = grace + 7
  const tier3Start = grace + 8

  if (dayNumber === removalDay) {
    if (size === '40ft') return roundUsd(withVat(150) + 40)
    return roundUsd(withVat(100) + 20)
  }
  if (dayNumber >= tier2Start && dayNumber <= tier2End) {
    return roundUsd(size === '40ft' ? withVat(40) : withVat(20))
  }
  if (dayNumber >= tier3Start) {
    return roundUsd(size === '40ft' ? withVat(80) : withVat(40))
  }
  return 0
}

function summarizeDemurrage(
  total: number,
  status: AccrualStatus,
  chargeableDays: number,
  currentDaily: number | null,
  freeDaysRemaining: number | null
): string {
  if (status === 'missing_dates') return 'Set discharge date to estimate demurrage.'
  if (status === 'stopped') return `Demurrage stopped — total USD ${total.toFixed(2)}`
  if (status === 'free' && freeDaysRemaining != null) {
    return `Free time — ${freeDaysRemaining} day(s) until demurrage`
  }
  if (currentDaily != null && chargeableDays > 0) {
    return `Accruing USD ${currentDaily.toFixed(2)}/day — ${chargeableDays} demurrage day(s), total USD ${total.toFixed(2)}`
  }
  return `Total demurrage USD ${total.toFixed(2)}`
}

function summarizeStorage(
  total: number,
  status: AccrualStatus,
  facility: StorageFacility,
  freeDaysRemaining: number | null
): string {
  const label = facility === 'icd' ? 'ICD' : 'Port'
  if (status === 'missing_dates') return `Set carrying date to estimate ${label} storage.`
  if (status === 'stopped') return `${label} storage stopped — total USD ${total.toFixed(2)}`
  if (status === 'free' && freeDaysRemaining != null) {
    return `${label} free time — ${freeDaysRemaining} day(s) until storage charges`
  }
  return `${label} storage accrued — total USD ${total.toFixed(2)}`
}

export function calculateDemurrage(
  dischargeDate: string,
  returnedDate: string,
  size: ContainerSizeClass,
  asOfDate: string
): CostAccrual {
  if (!dischargeDate.trim()) {
    return {
      status: 'missing_dates',
      totalUsd: 0,
      chargeableDays: 0,
      currentDailyUsd: null,
      summary: summarizeDemurrage(0, 'missing_dates', 0, null, null),
    }
  }

  const endDate = returnedDate.trim() || asOfDate
  const dayNumber = inclusiveDayNumber(dischargeDate, endDate)
  if (dayNumber == null || dayNumber < 1) {
    return {
      status: 'missing_dates',
      totalUsd: 0,
      chargeableDays: 0,
      currentDailyUsd: null,
      summary: summarizeDemurrage(0, 'missing_dates', 0, null, null),
    }
  }

  const stopped = Boolean(returnedDate.trim())
  if (dayNumber <= DEMURRAGE_FREE_DAYS) {
    const freeDaysRemaining = DEMURRAGE_FREE_DAYS - dayNumber
    return {
      status: stopped ? 'stopped' : 'free',
      totalUsd: 0,
      chargeableDays: 0,
      currentDailyUsd: null,
      summary: summarizeDemurrage(0, stopped ? 'stopped' : 'free', 0, null, freeDaysRemaining),
    }
  }

  let total = 0
  const lastDemurrageDay = dayNumber - DEMURRAGE_FREE_DAYS
  for (let d = 1; d <= lastDemurrageDay; d += 1) {
    total += demurrageDailyRate(d, size)
  }
  total = roundUsd(total)
  const currentDaily = demurrageDailyRate(lastDemurrageDay, size)

  return {
    status: stopped ? 'stopped' : 'accruing',
    totalUsd: total,
    chargeableDays: lastDemurrageDay,
    currentDailyUsd: stopped ? null : currentDaily,
    summary: summarizeDemurrage(
      total,
      stopped ? 'stopped' : 'accruing',
      lastDemurrageDay,
      stopped ? null : currentDaily,
      null
    ),
  }
}

export function calculateStorage(
  carryingDate: string,
  gateOutDate: string,
  size: ContainerSizeClass,
  facility: StorageFacility,
  asOfDate: string
): CostAccrual {
  if (!carryingDate.trim()) {
    return {
      status: 'missing_dates',
      totalUsd: 0,
      chargeableDays: 0,
      currentDailyUsd: null,
      summary: summarizeStorage(0, 'missing_dates', facility, null),
    }
  }

  const endDate = gateOutDate.trim() || asOfDate
  const dayNumber = inclusiveDayNumber(carryingDate, endDate)
  if (dayNumber == null || dayNumber < 1) {
    return {
      status: 'missing_dates',
      totalUsd: 0,
      chargeableDays: 0,
      currentDailyUsd: null,
      summary: summarizeStorage(0, 'missing_dates', facility, null),
    }
  }

  const grace = storageGraceDays(facility)
  const stopped = Boolean(gateOutDate.trim())
  if (dayNumber <= grace) {
    const freeDaysRemaining = grace - dayNumber
    return {
      status: stopped ? 'stopped' : 'free',
      totalUsd: 0,
      chargeableDays: 0,
      currentDailyUsd: null,
      summary: summarizeStorage(0, stopped ? 'stopped' : 'free', facility, freeDaysRemaining),
    }
  }

  let total = 0
  let chargeableDays = 0
  for (let d = 1; d <= dayNumber; d += 1) {
    const charge = storageChargeForDay(d, size, facility)
    if (charge > 0) {
      chargeableDays += 1
      total += charge
    }
  }
  total = roundUsd(total)
  const currentDaily = storageChargeForDay(dayNumber, size, facility) || null

  return {
    status: stopped ? 'stopped' : 'accruing',
    totalUsd: total,
    chargeableDays,
    currentDailyUsd: stopped ? null : currentDaily,
    summary: summarizeStorage(total, stopped ? 'stopped' : 'accruing', facility, null),
  }
}

export function calculateContainerCosts(input: ContainerCostInput): ContainerCostBreakdown {
  const asOf = input.asOfDate?.trim() || new Date().toISOString().slice(0, 10)
  const sizeClass = classifyContainerSize(input.containerType)

  return {
    sizeClass,
    demurrage: calculateDemurrage(
      input.dischargeDate,
      input.returnedDate,
      sizeClass,
      asOf
    ),
    storage: calculateStorage(
      input.carryingDate,
      input.gateOutDate,
      sizeClass,
      input.storageFacility,
      asOf
    ),
  }
}

export function isReleaseOrderDocumentName(name: string): boolean {
  return /release\s*order/i.test(name.trim())
}

export function inferStorageFacility(
  icdTransfer: string,
  explicit?: string | null
): StorageFacility {
  const normalized = (explicit || '').trim().toLowerCase()
  if (normalized === 'icd' || normalized === 'port') return normalized
  return icdTransfer.trim().toUpperCase() === 'YES' ? 'icd' : 'port'
}

export function formatUsd(amount: number): string {
  return `USD ${amount.toFixed(2)}`
}

export type ContainerDepositStatus = 'none' | 'paid' | 'forfeited' | 'refunded'

export const DEPOSIT_STATUS_LABEL: Record<Exclude<ContainerDepositStatus, 'none'>, string> = {
  paid: 'Deposit held',
  forfeited: 'Deposit held — demurrage unpaid',
  refunded: 'Deposit refunded',
}

export function parseDepositAmount(value: string): number {
  const parsed = Number(String(value).replace(/,/g, '').trim())
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0
}

export function hasContainerDeposit(depositAmount: string, depositPaidDate: string): boolean {
  return parseDepositAmount(depositAmount) > 0 && Boolean(depositPaidDate.trim())
}

export function canRefundDeposit(
  demurragePaid: boolean,
  demurrageOwedUsd: number
): boolean {
  return demurragePaid || demurrageOwedUsd <= 0
}

export function resolveContainerDepositStatus(input: {
  depositAmount: string
  depositPaidDate: string
  demurragePaid: boolean
  demurrageOwedUsd: number
  returnedDate: string
  interchangeDate: string
  depositRefundedDate: string
}): ContainerDepositStatus {
  if (!hasContainerDeposit(input.depositAmount, input.depositPaidDate)) {
    return 'none'
  }

  const interchangeRecorded = Boolean(input.interchangeDate.trim())
  const refundRecorded = Boolean(input.depositRefundedDate.trim())
  const demurrageCleared = canRefundDeposit(input.demurragePaid, input.demurrageOwedUsd)

  if ((interchangeRecorded || refundRecorded) && demurrageCleared) {
    return 'refunded'
  }

  if (
    input.returnedDate.trim() &&
    input.demurrageOwedUsd > 0 &&
    !input.demurragePaid
  ) {
    return 'forfeited'
  }

  return 'paid'
}

export function summarizeContainerDeposit(input: {
  depositAmount: string
  depositPaidDate: string
  demurragePaid: boolean
  demurrageOwedUsd: number
  returnedDate: string
  interchangeDate: string
  depositRefundedDate: string
}): string {
  const status = resolveContainerDepositStatus(input)
  const amount = parseDepositAmount(input.depositAmount)

  if (status === 'none') {
    return 'No deposit recorded — enter amount and paid date after shipping line invoice.'
  }
  if (status === 'paid') {
    return `${formatUsd(amount)} held until container is returned with demurrage settled and interchange issued.`
  }
  if (status === 'forfeited') {
    return `${formatUsd(amount)} held until demurrage is paid — full refund on interchange once demurrage is settled.`
  }
  return `${formatUsd(amount)} refunded in full on interchange.`
}

export function isInterchangeDocumentName(name: string): boolean {
  return /container\s*interchange|interchange/i.test(name.trim())
}
