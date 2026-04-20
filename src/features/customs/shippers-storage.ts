export type Shipper = {
  id: number
  name: string
  address1: string
  address2: string
  address3: string
  city: string
  country: string
  email: string
  contactName: string
  designation: string
  telNo: string
  extNo: string
  faxNo: string
  contactEmail: string
  mobile: string
  ieCode: string
  createdAt: string
}

/** Map API (camelCase) shipper payload to local `Shipper` shape */
export function mapShipperFromApi(row: Record<string, unknown>): Shipper {
  return {
    id: Number(row.id) || 0,
    name: String(row.name ?? ''),
    address1: String(row.address1 ?? ''),
    address2: String(row.address2 ?? ''),
    address3: String(row.address3 ?? ''),
    city: String(row.city ?? ''),
    country: String(row.country ?? ''),
    email: String(row.email ?? ''),
    contactName: String(row.contactName ?? ''),
    designation: String(row.designation ?? ''),
    telNo: String(row.telNo ?? ''),
    extNo: String(row.extNo ?? ''),
    faxNo: String(row.faxNo ?? ''),
    contactEmail: String(row.contactEmail ?? ''),
    mobile: String(row.mobile ?? ''),
    ieCode: String(row.ieCode ?? ''),
    createdAt: typeof row.createdAt === 'string' ? row.createdAt : new Date().toISOString(),
  }
}

const STORAGE_KEY = 'customs_shippers_v1'

export function getStoredShippers(): Shipper[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as Shipper[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function saveStoredShippers(shippers: Shipper[]): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(shippers))
}

export function prependStoredShipper(shipper: Shipper): void {
  const shippers = getStoredShippers()
  saveStoredShippers([shipper, ...shippers])
}
