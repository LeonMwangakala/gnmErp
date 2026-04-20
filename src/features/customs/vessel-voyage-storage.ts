export type VesselVoyage = {
  id: number
  status: 'ACTIVE' | 'INACTIVE'
  vesselId: number | null
  vesselName: string
  voyage: string
  arrivalDate: string
  berthingDate: string
  carryingDate: string
  documentDeadline: string
  paymentCutOff: string
  manifestReadyTraDate: string
  manifestReadyInvoiceDate: string
  portOperator: string
  createdAt: string
}

const STORAGE_KEY = 'customs_vessel_voyages_v3'

export function getStoredVesselVoyages(): VesselVoyage[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as Record<string, unknown>[]
    if (!Array.isArray(parsed)) return []
    return parsed.map((row) => ({
      id: Number(row.id) || 0,
      status: row.status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE',
      vesselId:
        row.vesselId === null || row.vesselId === undefined || row.vesselId === ''
          ? null
          : Number(row.vesselId) || null,
      vesselName: String(row.vesselName ?? ''),
      voyage: String(row.voyage ?? ''),
      arrivalDate: String(row.arrivalDate ?? row.arrivalDatePilotStation ?? ''),
      berthingDate: String(row.berthingDate ?? ''),
      carryingDate: String(row.carryingDate ?? ''),
      documentDeadline: String(row.documentDeadline ?? ''),
      paymentCutOff: String(row.paymentCutOff ?? ''),
      manifestReadyTraDate: String(row.manifestReadyTraDate ?? ''),
      manifestReadyInvoiceDate: String(row.manifestReadyInvoiceDate ?? ''),
      portOperator: String(row.portOperator ?? ''),
      createdAt: typeof row.createdAt === 'string' ? row.createdAt : new Date().toISOString(),
    }))
  } catch {
    return []
  }
}

export function saveStoredVesselVoyages(voyages: VesselVoyage[]): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(voyages))
}

export function prependStoredVesselVoyage(voyage: VesselVoyage): void {
  const rows = getStoredVesselVoyages()
  saveStoredVesselVoyages([voyage, ...rows])
}
