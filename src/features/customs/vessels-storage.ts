export type LinkedShipperRef = {
  id: number
  name: string
}

export type Vessel = {
  id: number
  status: 'ACTIVE' | 'INACTIVE'
  vesselName: string
  imageUrl: string
  imo: string
  mmsi: string
  built: number | null
  grossTonnage: number | null
  deadweight: number | null
  size: string
  createdAt: string
  linkedShipperIds: number[]
  linkedShippers: LinkedShipperRef[]
}

function numOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

function parseLinkedShippers(row: Record<string, unknown>): LinkedShipperRef[] {
  const raw = row.linkedShippers
  if (!Array.isArray(raw)) return []
  const out: LinkedShipperRef[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const rec = item as Record<string, unknown>
    const id = Number(rec.id)
    if (!Number.isFinite(id) || id <= 0) continue
    out.push({ id, name: String(rec.name ?? '') })
  }
  return out
}

/** Map API (camelCase) vessel payload to local `Vessel` shape */
export function mapVesselFromApi(row: Record<string, unknown>): Vessel {
  const linkedIdsRaw = row.linkedShipperIds
  const linkedIds = Array.isArray(linkedIdsRaw)
    ? linkedIdsRaw.map((x) => Number(x)).filter((n) => Number.isFinite(n) && n > 0)
    : []

  let linkedShippers = parseLinkedShippers(row)
  if (linkedShippers.length === 0 && linkedIds.length > 0) {
    linkedShippers = linkedIds.map((id) => ({ id, name: '' }))
  }

  const linkedShipperIds =
    linkedShippers.length > 0 ? linkedShippers.map((s) => s.id) : linkedIds

  return {
    id: Number(row.id) || 0,
    vesselName: String(row.vesselName ?? ''),
    imageUrl: typeof row.imageUrl === 'string' ? row.imageUrl : '',
    imo: String(row.imo ?? ''),
    mmsi: String(row.mmsi ?? ''),
    built: (() => {
      if (row.built === null || row.built === undefined || row.built === '') return null
      const n = Number(row.built)
      return Number.isFinite(n) ? n : null
    })(),
    grossTonnage: numOrNull(row.grossTonnage),
    deadweight: numOrNull(row.deadweight),
    size: String(row.size ?? ''),
    status: row.status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE',
    createdAt: typeof row.createdAt === 'string' ? row.createdAt : new Date().toISOString(),
    linkedShipperIds,
    linkedShippers,
  }
}

const STORAGE_KEY = 'customs_vessels_v3'

export function getStoredVessels(): Vessel[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as Record<string, unknown>[]
    if (!Array.isArray(parsed)) return []
    return parsed.map((row) => mapVesselFromApi(row))
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
