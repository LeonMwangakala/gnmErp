export type Vessel = {
  id: number
  status: 'ACTIVE' | 'INACTIVE'
  vesselName: string
  lineName: string
  vesselOwner: 'YES' | 'NO'
  createdAt: string
  linkedShipperIds: number[]
}

const STORAGE_KEY = 'customs_vessels_v1'

export function getStoredVessels(): Vessel[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as Vessel[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function saveStoredVessels(vessels: Vessel[]): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(vessels))
}

export function prependStoredVessel(vessel: Vessel): void {
  const rows = getStoredVessels()
  saveStoredVessels([vessel, ...rows])
}
