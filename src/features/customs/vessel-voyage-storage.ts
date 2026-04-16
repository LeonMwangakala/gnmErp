export type VesselVoyage = {
  id: number
  status: 'ACTIVE' | 'INACTIVE'
  vesselId: number | null
  vesselName: string
  voyage: string
  eta: string
  arrivalDatePilotStation: string
  berthingDate: string
  berthingTime: string
  documentDeadline: string
  sailingDateEtd: string
  sailingTime: string
  paymentCutOff: string
  manifestReadyTraDate: string
  manifestReadyTraTime: string
  manifestReadyInvoiceDate: string
  manifestReadyInvoiceTime: string
  portOperator: string
  createdAt: string
}

const STORAGE_KEY = 'customs_vessel_voyages_v1'

export function getStoredVesselVoyages(): VesselVoyage[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as VesselVoyage[]
    return Array.isArray(parsed) ? parsed : []
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
