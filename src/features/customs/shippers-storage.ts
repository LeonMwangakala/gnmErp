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
