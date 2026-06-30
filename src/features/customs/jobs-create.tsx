import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import { getRouteApi } from '@tanstack/react-router'
import AsyncSelect from 'react-select/async'
import { ChevronDown, ChevronRight, Download, Eye, Plus } from 'lucide-react'
import { toast } from 'sonner'
import * as XLSX from 'xlsx'
import { CustomsPage } from './customs-page'
import { validateCustomsDocumentFile } from './document-upload'
import {
  calculateContainerCosts,
  formatUsd,
  inferStorageFacility,
  isReleaseOrderDocumentName,
  type StorageFacility,
} from './container-costs'
import {
  createInitialJobStageAssignments,
  createInitialJobStageProgress,
  prependStoredJob,
  type Job,
} from './jobs-storage'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogDescription,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import {
  customerApi,
  CUSTOMS_DOCUMENT_STAGE_CODES,
  FALLBACK_JOB_DOCUMENT_TYPES,
  labelForCustomsDocumentStage,
  customsCountryApi,
  customsDocumentTypeApi,
  customsIcdApi,
  customsJobApi,
  customsPortApi,
  customsShipperApi,
  customsVesselApi,
  type CustomsCountry,
  type CustomsDocumentType,
  type CustomsIcd,
  type CustomsPort,
} from '@/lib/api'
import { customsVesselVoyageApi } from '@/lib/api'
import { useAuthStore } from '@/stores/auth-store'
import { getStoredVessels, saveStoredVessels, type Vessel } from './vessels-storage'
import { type Shipper } from './shippers-storage'

const jobsCreateRoute = getRouteApi('/customs/jobs/create')
import {
  getStoredVesselVoyages,
  saveStoredVesselVoyages,
  type VesselVoyage,
} from './vessel-voyage-storage'

const CONTAINER_TYPE_OPTIONS = [
  '20TK',
  '20GP',
  '20OT',
  '20RE',
  '20DV',
  '40GP',
  '40OT',
  '40RE',
  '20FR',
  '40FR',
  '40HC',
  '40HQ',
  '40DV',
] as const

type ContainerShipmentRow = {
  containerNo: string
  type: string
  sealNo: string
  perContainerWeight: string
  gateOutDate: string
  returnedDate: string
}

const emptyContainerRow = (): ContainerShipmentRow => ({
  containerNo: '',
  type: '',
  sealNo: '',
  perContainerWeight: '',
  gateOutDate: '',
  returnedDate: '',
})

/** Common engine displacements (CC) for vehicle shipment declarations */
const ENGINE_CAPACITY_CC_OPTIONS = [
  '660 CC',
  '800 CC',
  '1000 CC',
  '1100 CC',
  '1200 CC',
  '1300 CC',
  '1400 CC',
  '1500 CC',
  '1600 CC',
  '1700 CC',
  '1800 CC',
  '1900 CC',
  '2000 CC',
  '2200 CC',
  '2400 CC',
  '2500 CC',
  '2700 CC',
  '2800 CC',
  '3000 CC',
  '3200 CC',
  '3500 CC',
  '4000 CC',
  '4200 CC',
  '4500 CC',
  '5000 CC',
  '5500 CC',
  '6000 CC',
] as const

type JobForm = {
  shipmentType: string
  mblNo: string
  hblNo: string
  invoiceNo: string
  customerName: string
  customerId: string
  customerRefNo: string
  dateOfReceipt: string
  cargoType: string
  typeOfCargo: string
  referenceNo: string
  ucrNo: string
  tansadNo: string
  idfTansadDate: string
  fileManager: string
  fileManagerId: string
  createdBy: string
  createdById: string
  supplierName: string
  supplierAddress: string
  consigneeName: string
  consigneeAddress: string
  notifyPartyName: string
  notifyAddress: string
  status: string
  shippingLine: string
  carryingDate: string
  dischargeDate: string
  arrivalDate: string
  berthingDate: string
  loadingVessel: string
  loadingVoyage: string
  dischargingVessel: string
  dischargingVoyage: string
  vesselLocalAgent: string
  vesselType: string
  vesselBerthedAt: string
  icdTransfer: string
  icdTransferLocation: string
  storageFacility: StorageFacility | ''
  originCountry: string
  destinationCountry: string
  portOfLoading: string
  portOfDischarge: string
  nominatedBy: string
  marks: string
  shipmentDescription: string
  totalNoOfPkgs: string
  totalCrWt: string
  pono: string
  currency: string
  fobValue: string
  preAssessmentDate: string
  finalAssessmentDate: string
  containerShipment: Array<ContainerShipmentRow>
  vehicleShipment: Array<{
    chasisNo: string
    engineCapacity: string
    cbm: string
    berthingDate: string
    customReleaseDate: string
    driverCellNo: string
    dateOfDeparture: string
    dateOfArrivalAtBorder: string
    dateOfDepartAtBorder: string
    dateOfDelivery: string
  }>
  looseCargoShipment: Array<{
    truckNo: string
    trailerNo: string
    transporter: string
    licenceNo: string
    driverName: string
    truckRegCard: string
    trailerRegCard: string
  }>
  documentsNotes: string
  lettersNotes: string
  internalNotes: string
  /** Master shipper record id from API (optional) */
  shipperId: string
}

type CommodityRow = {
  itemNo: string
  commodityCode: string
  desc: string
  modeSpecification: string
  component: string
  quantity: string
  unitPrice: string
  itemInvPrice: string
}

type CustomerOption = {
  value: string
  label: string
  id: number
  name: string
  email?: string
  customer_number?: string
}

type FileManagerOption = {
  value: string
  label: string
  id: number
  name: string
  email?: string
  department_name?: string
}

const initialForm: JobForm = {
  shipmentType: 'SEA',
  mblNo: '',
  hblNo: '',
  invoiceNo: '',
  customerName: '',
  customerId: '',
  customerRefNo: '',
  dateOfReceipt: '',
  cargoType: 'FCL',
  typeOfCargo: 'NORMAL',
  referenceNo: '',
  ucrNo: '',
  tansadNo: '',
  idfTansadDate: '',
  fileManager: '',
  fileManagerId: '',
  createdBy: '',
  createdById: '',
  supplierName: '',
  supplierAddress: '',
  consigneeName: '',
  consigneeAddress: '',
  notifyPartyName: '',
  notifyAddress: '',
  status: 'OTHER',
  shippingLine: '',
  carryingDate: '',
  dischargeDate: '',
  arrivalDate: '',
  berthingDate: '',
  loadingVessel: '',
  loadingVoyage: '',
  dischargingVessel: '',
  dischargingVoyage: '',
  vesselLocalAgent: '',
  vesselType: '',
  vesselBerthedAt: '',
  icdTransfer: '',
  icdTransferLocation: '',
  storageFacility: '',
  originCountry: '',
  destinationCountry: '',
  portOfLoading: '',
  portOfDischarge: '',
  nominatedBy: '',
  marks: '',
  shipmentDescription: '',
  totalNoOfPkgs: '0',
  totalCrWt: '0',
  pono: '',
  currency: '',
  fobValue: '',
  preAssessmentDate: '',
  finalAssessmentDate: '',
  containerShipment: [emptyContainerRow()],
  vehicleShipment: [{
    chasisNo: '', engineCapacity: '', cbm: '', berthingDate: '', customReleaseDate: '', driverCellNo: '',
    dateOfDeparture: '', dateOfArrivalAtBorder: '', dateOfDepartAtBorder: '', dateOfDelivery: '',
  }],
  looseCargoShipment: [{
    truckNo: '', trailerNo: '', transporter: '', licenceNo: 'NOT AVAILABLE', driverName: '', truckRegCard: '', trailerRegCard: '',
  }],
  documentsNotes: '',
  lettersNotes: '',
  internalNotes: '',
  shipperId: '',
}

type JobNote = {
  id: number
  user: string
  subject: string
  body: string
  date: string
}

type JobEditableSnapshotInput = {
  form: JobForm
  commoditySearch: string
  commodityRows: CommodityRow[]
  uploadedCommodityFiles: string[]
  authorizationLetters: string[]
  notes: JobNote[]
  uploadedDocuments: Array<{
    id: number
    name: string
    fileName: string
    filePath?: string
    fileUrl?: string
    pendingFile: boolean
  }>
  pendingUploads: Array<{ id: number; name: string; fileName: string }>
}

function serializeJobEditableState(input: JobEditableSnapshotInput): string {
  return JSON.stringify(input)
}

type UploadedJobDocumentRow = {
  id: number
  name: string
  fileName: string
  fileSize: string
  date: string
  file?: File
  filePath?: string
  fileUrl?: string
  mimeType?: string
}

function mapJobDocumentRow(row: Record<string, unknown>): UploadedJobDocumentRow {
  const fileSizeBytes = Number(row.file_size_bytes || 0)
  return {
    id: Number(row.id) || Date.now(),
    name: String(row.name || row.document_name || '-'),
    fileName: String(row.file_name || row.original_file_name || '-'),
    fileSize: fileSizeBytes
      ? `${Math.max(1, Math.round(fileSizeBytes / 1024))} KB`
      : '-',
    date: row.created_at ? new Date(String(row.created_at)).toLocaleDateString() : '-',
    filePath: row.file_path ? String(row.file_path) : undefined,
    fileUrl: row.file_url ? String(row.file_url) : undefined,
    mimeType: row.mime_type ? String(row.mime_type) : undefined,
  }
}

function mapUploadedDocumentSnapshot(docs: UploadedJobDocumentRow[]) {
  return docs.map((doc) => ({
    id: doc.id,
    name: doc.name,
    fileName: doc.fileName,
    filePath: doc.filePath,
    fileUrl: doc.fileUrl,
    pendingFile: doc.file instanceof File,
  }))
}

function JobFormSkeleton() {
  return (
    <div className='space-y-6' aria-busy='true' aria-label='Loading job details'>
      <div className='grid grid-cols-1 gap-3 md:grid-cols-4'>
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={`header-${i}`} className='space-y-2'>
            <Skeleton className='h-4 w-24' />
            <Skeleton className='h-9 w-full' />
          </div>
        ))}
      </div>
      <div className='flex flex-wrap gap-2'>
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton key={`tab-${i}`} className='h-9 w-28' />
        ))}
      </div>
      <div className='space-y-4 rounded-md border p-4'>
        {Array.from({ length: 5 }).map((_, rowIdx) => (
          <div key={`row-${rowIdx}`} className='grid grid-cols-1 gap-3 md:grid-cols-3'>
            <Skeleton className='h-9 w-full' />
            <Skeleton className='h-9 w-full' />
            <Skeleton className='h-9 w-full' />
          </div>
        ))}
      </div>
      <div className='flex items-center justify-end gap-2'>
        <Skeleton className='h-9 w-24' />
        <Skeleton className='h-9 w-28' />
      </div>
    </div>
  )
}

export type CustomsCreateJobEmbeddedProps = {
  mode: 'view' | 'update' | 'create'
  jobId: number
  onClose: () => void
}

type CustomsCreateJobProps = {
  embedded?: CustomsCreateJobEmbeddedProps
}

export function CustomsCreateJob({ embedded }: CustomsCreateJobProps = {}) {
  const loggedInUser = useAuthStore((s) => s.auth.user)
  const routerSearch = jobsCreateRoute.useSearch()
  const pageMode = useMemo(() => {
    if (embedded?.mode) return embedded.mode
    const m = (routerSearch.mode || '').toLowerCase()
    if (m === 'view') return 'view'
    if (m === 'update') return 'update'
    return 'create'
  }, [embedded?.mode, routerSearch.mode])
  const editingJobId = useMemo(() => {
    if (embedded?.jobId != null && embedded.jobId > 0) return embedded.jobId
    const candidates = [routerSearch.id, routerSearch.jobId, routerSearch.job_id].filter(Boolean) as string[]
    for (const raw of candidates) {
      const n = Number(raw)
      if (Number.isFinite(n) && n > 0) return n
    }
    return null
  }, [embedded?.jobId, routerSearch.id, routerSearch.jobId, routerSearch.job_id])
  const isViewMode = pageMode === 'view'
  const shouldLoadExistingJob =
    (pageMode === 'view' || pageMode === 'update') && editingJobId != null
  const [currentJobId, setCurrentJobId] = useState<number | null>(null)
  const [form, setForm] = useState<JobForm>(initialForm)
  const [shipmentTypeOptions, setShipmentTypeOptions] = useState<string[]>([
    'SEA',
    'AIR',
    'ROAD',
    'POST_ENTRY',
  ])
  const [cargoTypeOptions, setCargoTypeOptions] = useState<string[]>(['FCL', 'LCL'])
  const [typeOfCargoOptions, setTypeOfCargoOptions] = useState<string[]>([
    'NORMAL',
    'DANGEROUS',
    'FRAGILE',
    'ABNORMAL',
    'PERISHABLE',
  ])
  const [documentsSearch, setDocumentsSearch] = useState('')
  const [releaseOrderContainerNo, setReleaseOrderContainerNo] = useState('')
  const [releaseOrderGateOutDate, setReleaseOrderGateOutDate] = useState('')
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)
  const [documentName, setDocumentName] = useState('')
  const [documentNameOther, setDocumentNameOther] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [pendingUploads, setPendingUploads] = useState<
    Array<{
      id: number
      name: string
      fileName: string
      fileSize: string
      date: string
      file: File
    }>
  >([])
  const [uploadedDocuments, setUploadedDocuments] = useState<
    Array<{
      id: number
      name: string
      fileName: string
      fileSize: string
      date: string
      file?: File
      filePath?: string
      fileUrl?: string
      mimeType?: string
    }>
  >([])
  const [documentsLoading, setDocumentsLoading] = useState(false)
  const [documentsUploading, setDocumentsUploading] = useState(false)
  const [jobDocumentTypes, setJobDocumentTypes] = useState<CustomsDocumentType[]>([])
  const [jobDocumentTypesLoadFailed, setJobDocumentTypesLoadFailed] = useState(false)
  const [isDocumentPreviewOpen, setIsDocumentPreviewOpen] = useState(false)
  const [documentPreviewUrl, setDocumentPreviewUrl] = useState('')
  const [documentPreviewName, setDocumentPreviewName] = useState('')
  const [documentPreviewMimeType, setDocumentPreviewMimeType] = useState('')
  const [documentPreviewObjectUrl, setDocumentPreviewObjectUrl] = useState<string | null>(null)
  const [authorizationLetters, setAuthorizationLetters] = useState<string[]>([])
  const [selectedAuthorizationLetter, setSelectedAuthorizationLetter] = useState<File | null>(null)
  const [isNotesModalOpen, setIsNotesModalOpen] = useState(false)
  const [noteSubject, setNoteSubject] = useState('')
  const [noteBody, setNoteBody] = useState('')
  const [notes, setNotes] = useState<
    Array<{
      id: number
      user: string
      subject: string
      body: string
      date: string
    }>
  >([])
  const [openShipmentSections, setOpenShipmentSections] = useState({ container: false, vehicle: false, looseCargo: false })
  const [commoditySearch, setCommoditySearch] = useState('')
  const [commodityRows, setCommodityRows] = useState<CommodityRow[]>([])
  const [uploadedCommodityFiles, setUploadedCommodityFiles] = useState<string[]>([])
  const csvInputRef = useRef<HTMLInputElement | null>(null)
  const excelInputRef = useRef<HTMLInputElement | null>(null)

  const [vessels, setVessels] = useState<Vessel[]>([])
  const [vesselVoyages, setVesselVoyages] = useState<VesselVoyage[]>([])
  const [shipperOptions, setShipperOptions] = useState<Shipper[]>([])
  const [icdOptions, setIcdOptions] = useState<CustomsIcd[]>([])
  const [customsCountries, setCustomsCountries] = useState<CustomsCountry[]>([])
  const [originCountryId, setOriginCountryId] = useState('')
  const [destinationCountryId, setDestinationCountryId] = useState('')
  const [portsOrigin, setPortsOrigin] = useState<CustomsPort[]>([])
  const [portsDestination, setPortsDestination] = useState<CustomsPort[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [loadingJob, setLoadingJob] = useState(shouldLoadExistingJob)
  const [savedSnapshot, setSavedSnapshot] = useState(() =>
    serializeJobEditableState({
      form: initialForm,
      commoditySearch: '',
      commodityRows: [],
      uploadedCommodityFiles: [],
      authorizationLetters: [],
      notes: [],
      uploadedDocuments: [],
      pendingUploads: [],
    })
  )
  const captureBaselineAfterLoad = useRef(false)
  /** Lock form fields in view mode; keep tab triggers & non-field actions (e.g. collapse, preview) usable */
  const formDisabled = isViewMode || isSaving || loadingJob
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerOption | null>(null)
  const [selectedFileManager, setSelectedFileManager] = useState<FileManagerOption | null>(null)
  const [fileManagerSeedOptions, setFileManagerSeedOptions] = useState<FileManagerOption[]>([])

  const resolvedStorageFacility = useMemo(
    () => inferStorageFacility(form.icdTransfer, form.storageFacility || null),
    [form.icdTransfer, form.storageFacility]
  )

  const containerCostSummaries = useMemo(
    () =>
      form.containerShipment.map((row) =>
        calculateContainerCosts({
          containerType: row.type,
          dischargeDate: form.dischargeDate,
          carryingDate: form.carryingDate,
          storageFacility: resolvedStorageFacility,
          gateOutDate: row.gateOutDate,
          returnedDate: row.returnedDate,
        })
      ),
    [
      form.containerShipment,
      form.dischargeDate,
      form.carryingDate,
      resolvedStorageFacility,
    ]
  )

  const isReleaseOrderUpload = useMemo(
    () => isReleaseOrderDocumentName(documentName || documentNameOther),
    [documentName, documentNameOther]
  )

  const updateField = <K extends keyof JobForm>(key: K, value: JobForm[K]) => setForm((p) => ({ ...p, [key]: value }))

  const buildCurrentSnapshot = useCallback(
    (): string =>
      serializeJobEditableState({
        form,
        commoditySearch,
        commodityRows,
        uploadedCommodityFiles,
        authorizationLetters,
        notes,
        uploadedDocuments: mapUploadedDocumentSnapshot(uploadedDocuments),
        pendingUploads: pendingUploads.map((doc) => ({
          id: doc.id,
          name: doc.name,
          fileName: doc.fileName,
        })),
      }),
    [
      form,
      commoditySearch,
      commodityRows,
      uploadedCommodityFiles,
      authorizationLetters,
      notes,
      uploadedDocuments,
      pendingUploads,
    ]
  )

  const isDirty = useMemo(() => {
    if (isViewMode || loadingJob) return false
    return buildCurrentSnapshot() !== savedSnapshot
  }, [isViewMode, loadingJob, buildCurrentSnapshot, savedSnapshot])

  useEffect(() => {
    if (!captureBaselineAfterLoad.current || loadingJob) return
    captureBaselineAfterLoad.current = false
    setSavedSnapshot(buildCurrentSnapshot())
  }, [loadingJob, buildCurrentSnapshot])

  const loadCustomerOptions = async (inputValue: string): Promise<CustomerOption[]> => {
    const search = inputValue.trim()
    if (search.length < 2) return []
    try {
      const results = await customerApi.searchCustomers(search, 20)
      if (!Array.isArray(results)) return []
      return results
        .map((row: any) => {
          const id = Number(row.id ?? row.customer_id ?? 0)
          if (!Number.isFinite(id) || id <= 0) return null
          const name = String(row.name || '')
          return {
            value: String(id),
            label: `${name}${row.customer_number ? ` (${row.customer_number})` : ''}`,
            id,
            name,
            email: row.email ? String(row.email) : undefined,
            customer_number: row.customer_number ? String(row.customer_number) : undefined,
          } as CustomerOption
        })
        .filter(Boolean) as CustomerOption[]
    } catch {
      return []
    }
  }

  const loadFileManagerOptions = async (inputValue: string): Promise<FileManagerOption[]> => {
    const search = inputValue.trim()
    try {
      const results = await customsJobApi.searchFileManagers(search, 20)
      if (!Array.isArray(results)) return []
      const mapped = results
        .map((row: any) => {
          const id = Number(row.id || 0)
          if (!Number.isFinite(id) || id <= 0) return null
          return {
            value: String(id),
            label: String(row.label || row.name || `User #${id}`),
            id,
            name: String(row.name || ''),
            email: row.email ? String(row.email) : undefined,
            department_name: row.department_name ? String(row.department_name) : undefined,
          } as FileManagerOption
        })
        .filter(Boolean) as FileManagerOption[]
      if (search === '') {
        setFileManagerSeedOptions(mapped)
      }
      if (mapped.length > 0) return mapped
      if (fileManagerSeedOptions.length === 0) return []
      const needle = search.toLowerCase()
      return fileManagerSeedOptions.filter((opt) => {
        if (!needle) return true
        return (
          opt.name.toLowerCase().includes(needle) ||
          opt.label.toLowerCase().includes(needle) ||
          (opt.email || '').toLowerCase().includes(needle) ||
          (opt.department_name || '').toLowerCase().includes(needle)
        )
      })
    } catch {
      if (fileManagerSeedOptions.length === 0) return []
      const needle = search.toLowerCase()
      return fileManagerSeedOptions.filter((opt) => {
        if (!needle) return true
        return (
          opt.name.toLowerCase().includes(needle) ||
          opt.label.toLowerCase().includes(needle) ||
          (opt.email || '').toLowerCase().includes(needle) ||
          (opt.department_name || '').toLowerCase().includes(needle)
        )
      })
    }
  }

  useEffect(() => {
    let cancelled = false
    loadFileManagerOptions('').then((options) => {
      if (!cancelled && options.length > 0) {
        setFileManagerSeedOptions(options)
      }
    })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    customsVesselApi
      .list({ per_page: 200, page: 1 })
      .then((res) => {
        if (!cancelled) {
          setVessels(res.data)
          saveStoredVessels(res.data)
        }
      })
      .catch(() => {
        if (!cancelled) setVessels(getStoredVessels())
      })
    customsVesselVoyageApi
      .list()
      .then((rows) => {
        if (!cancelled) {
          setVesselVoyages(rows)
          saveStoredVesselVoyages(rows)
        }
      })
      .catch(() => {
        if (!cancelled) setVesselVoyages(getStoredVesselVoyages())
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    customsShipperApi
      .list({ per_page: 200, page: 1 })
      .then((res) => {
        if (!cancelled) setShipperOptions(res.data)
      })
      .catch(() => {
        if (!cancelled) setShipperOptions([])
      })
    return () => {
      cancelled = true
    }
  }, [])

  /** Shipping line is stored as free text (`shipping_line`); options come from customs shippers by name. */
  const shippingLineSelectOptions = useMemo(() => {
    const byName = new Map<string, string>()
    for (const s of shipperOptions) {
      const name = String(s.name || '').trim()
      if (!name) continue
      const label = `${name}${s.city ? ` — ${s.city}` : ''}`
      if (!byName.has(name)) byName.set(name, label)
    }
    const rows = [...byName.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([value, label]) => ({ value, label }))
    const current = form.shippingLine.trim()
    if (current && !byName.has(current)) {
      rows.unshift({ value: current, label: `${current} (saved)` })
    }
    return rows
  }, [shipperOptions, form.shippingLine])

  const icdTransferLocationSelectOptions = useMemo(() => {
    const names = icdOptions
      .map((row) => String(row.name || '').trim())
      .filter(Boolean)
    const uniqueSorted = [...new Set(names)].sort((a, b) => a.localeCompare(b))
    const opts = uniqueSorted.map((value) => ({ value, label: value }))
    const current = form.icdTransferLocation.trim()
    if (current && !uniqueSorted.includes(current)) {
      opts.unshift({ value: current, label: `${current} (saved)` })
    }
    return opts
  }, [icdOptions, form.icdTransferLocation])

  const sortedCustomsCountries = useMemo(
    () => [...customsCountries].sort((a, b) => a.name.localeCompare(b.name)),
    [customsCountries]
  )

  const originCountrySelectOptions = useMemo(() => {
    const opts = sortedCustomsCountries.map((c) => ({ value: c.name, label: c.name }))
    const current = form.originCountry.trim()
    if (
      current &&
      !sortedCustomsCountries.some((c) => c.name.trim().toLowerCase() === current.toLowerCase())
    ) {
      opts.unshift({ value: current, label: `${current} (saved)` })
    }
    return opts
  }, [sortedCustomsCountries, form.originCountry])

  const destinationCountrySelectOptions = useMemo(() => {
    const opts = sortedCustomsCountries.map((c) => ({ value: c.name, label: c.name }))
    const current = form.destinationCountry.trim()
    if (
      current &&
      !sortedCustomsCountries.some((c) => c.name.trim().toLowerCase() === current.toLowerCase())
    ) {
      opts.unshift({ value: current, label: `${current} (saved)` })
    }
    return opts
  }, [sortedCustomsCountries, form.destinationCountry])

  const portLoadingSelectOptions = useMemo(() => {
    const names = portsOrigin.map((p) => String(p.name || '').trim()).filter(Boolean)
    const uniqueSorted = [...new Set(names)].sort((a, b) => a.localeCompare(b))
    const opts = uniqueSorted.map((value) => ({ value, label: value }))
    const current = form.portOfLoading.trim()
    if (current && !uniqueSorted.includes(current)) {
      opts.unshift({ value: current, label: `${current} (saved)` })
    }
    return opts
  }, [portsOrigin, form.portOfLoading])

  const portDischargeSelectOptions = useMemo(() => {
    const names = portsDestination.map((p) => String(p.name || '').trim()).filter(Boolean)
    const uniqueSorted = [...new Set(names)].sort((a, b) => a.localeCompare(b))
    const opts = uniqueSorted.map((value) => ({ value, label: value }))
    const current = form.portOfDischarge.trim()
    if (current && !uniqueSorted.includes(current)) {
      opts.unshift({ value: current, label: `${current} (saved)` })
    }
    return opts
  }, [portsDestination, form.portOfDischarge])

  useEffect(() => {
    let cancelled = false
    customsIcdApi
      .list({ per_page: 200, page: 1 })
      .then((res) => {
        if (!cancelled) setIcdOptions(res.data)
      })
      .catch(() => {
        if (!cancelled) setIcdOptions([])
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    customsDocumentTypeApi
      .list({ per_page: 200, page: 1 })
      .then((res) => {
        if (!cancelled) {
          setJobDocumentTypes(res.data)
          setJobDocumentTypesLoadFailed(false)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setJobDocumentTypes([])
          setJobDocumentTypesLoadFailed(true)
        }
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    customsCountryApi
      .list({ per_page: 200, page: 1 })
      .then((res) => {
        if (!cancelled) setCustomsCountries(res.data)
      })
      .catch(() => {
        if (!cancelled) setCustomsCountries([])
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (customsCountries.length === 0) {
      setOriginCountryId('')
      setDestinationCountryId('')
      return
    }
    const norm = (s: string) => s.trim().toLowerCase()
    const o = customsCountries.find((c) => norm(c.name) === norm(form.originCountry))
    setOriginCountryId(o ? String(o.id) : '')
    const d = customsCountries.find((c) => norm(c.name) === norm(form.destinationCountry))
    setDestinationCountryId(d ? String(d.id) : '')
  }, [customsCountries, form.originCountry, form.destinationCountry])

  useEffect(() => {
    const id = Number(originCountryId)
    if (!Number.isFinite(id) || id <= 0) {
      setPortsOrigin([])
      return
    }
    let cancelled = false
    customsPortApi
      .list({ country_id: id, per_page: 200, page: 1 })
      .then((res) => {
        if (!cancelled) setPortsOrigin(res.data)
      })
      .catch(() => {
        if (!cancelled) setPortsOrigin([])
      })
    return () => {
      cancelled = true
    }
  }, [originCountryId])

  useEffect(() => {
    const id = Number(destinationCountryId)
    if (!Number.isFinite(id) || id <= 0) {
      setPortsDestination([])
      return
    }
    let cancelled = false
    customsPortApi
      .list({ country_id: id, per_page: 200, page: 1 })
      .then((res) => {
        if (!cancelled) setPortsDestination(res.data)
      })
      .catch(() => {
        if (!cancelled) setPortsDestination([])
      })
    return () => {
      cancelled = true
    }
  }, [destinationCountryId])

  const documentUploadGroups = useMemo(() => {
    type DocUploadRow = {
      name: string
      stage: (typeof CUSTOMS_DOCUMENT_STAGE_CODES)[number]
      sortOrder: number
    }
    const rows: DocUploadRow[] = jobDocumentTypesLoadFailed
      ? FALLBACK_JOB_DOCUMENT_TYPES.map((r, i) => ({
          name: r.name,
          stage: r.stage,
          sortOrder: i + 1,
        }))
      : jobDocumentTypes.map((d) => ({
          name: d.name,
          stage: d.stage,
          sortOrder: d.sortOrder,
        }))
    const sorted = [...rows].sort((a, b) => {
      const ai = CUSTOMS_DOCUMENT_STAGE_CODES.indexOf(a.stage)
      const bi = CUSTOMS_DOCUMENT_STAGE_CODES.indexOf(b.stage)
      if (ai !== bi) return ai - bi
      if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder
      return a.name.localeCompare(b.name)
    })
    return CUSTOMS_DOCUMENT_STAGE_CODES.map((stage) => ({
      stage,
      label: labelForCustomsDocumentStage(stage),
      names: sorted.filter((r) => r.stage === stage).map((r) => r.name),
    })).filter((g) => g.names.length > 0)
  }, [jobDocumentTypes, jobDocumentTypesLoadFailed])

  useEffect(() => {
    if (!editingJobId || pageMode === 'create') return
    let cancelled = false
    setLoadingJob(true)
    setForm(initialForm)
    setSelectedCustomer(null)
    setSelectedFileManager(null)
    customsJobApi
      .getJob(editingJobId)
      .then(async (job) => {
        if (!job || cancelled) return
        const meta = (job.meta || {}) as Record<string, any>
        const jobDetails = (meta.job_details ?? job.job_details ?? {}) as Record<string, any>
        const lineVesselDetails = (meta.line_vessel_details ?? job.line_vessel_details ?? {}) as Record<
          string,
          any
        >
        const shipmentDetails = (meta.shipment_details ?? job.shipment_details ?? {}) as Record<string, any>
        const containerShipment = Array.isArray(meta.container_shipment)
          ? meta.container_shipment
          : Array.isArray(job.container_shipment)
            ? job.container_shipment
            : []
        const vehicleShipment = Array.isArray(meta.vehicle_shipment)
          ? meta.vehicle_shipment
          : Array.isArray(job.vehicle_shipment)
            ? job.vehicle_shipment
            : []
        const looseCargoShipment = Array.isArray(meta.loose_cargo_shipment)
          ? meta.loose_cargo_shipment
          : Array.isArray(job.loose_cargo_shipment)
            ? job.loose_cargo_shipment
            : []
        setCurrentJobId(Number(job.id) || editingJobId)
        setForm((prev) => ({
          ...prev,
          shipmentType: String(job.shipment_type || prev.shipmentType),
          mblNo: String(job.mbl_no || ''),
          hblNo: String(job.hbl_no || ''),
          invoiceNo: String(job.invoice_no || ''),
          customerName: String(job.customer_name || ''),
          customerId: job.customer_id ? String(job.customer_id) : '',
          customerRefNo: String(jobDetails.customer_ref_no || ''),
          dateOfReceipt: String(job.date_of_receipt || ''),
          cargoType: String(jobDetails.cargo_type || prev.cargoType),
          typeOfCargo: String(jobDetails.type_of_cargo || prev.typeOfCargo),
          referenceNo: String(jobDetails.reference_no || ''),
          ucrNo: String(jobDetails.ucr_no || ''),
          tansadNo: String(jobDetails.tansad_no || ''),
          idfTansadDate: String(jobDetails.idf_tansad_date || ''),
          fileManager: String(jobDetails.file_manager || ''),
          fileManagerId: String(jobDetails.file_manager_id || ''),
          createdBy: String(jobDetails.created_by || loggedInUser?.name || ''),
          createdById: String(jobDetails.created_by_id || loggedInUser?.id || ''),
          supplierName: String((meta.shipperDetails || {}).supplierName || ''),
          supplierAddress: String((meta.shipperDetails || {}).supplierAddress || ''),
          consigneeName: String((meta.shipperDetails || {}).consigneeName || ''),
          consigneeAddress: String((meta.shipperDetails || {}).consigneeAddress || ''),
          notifyPartyName: String((meta.shipperDetails || {}).notifyPartyName || ''),
          notifyAddress: String((meta.shipperDetails || {}).notifyAddress || ''),
          status: String(job.status || prev.status),
          shippingLine: String(lineVesselDetails.shipping_line || ''),
          carryingDate: String(lineVesselDetails.carrying_date || ''),
          dischargeDate: String(lineVesselDetails.discharge_date || ''),
          arrivalDate: String(lineVesselDetails.arrival_date || ''),
          berthingDate: String(lineVesselDetails.berthing_date || ''),
          loadingVessel: String(lineVesselDetails.loading_vessel || ''),
          loadingVoyage: String(lineVesselDetails.loading_voyage || ''),
          dischargingVessel: String(lineVesselDetails.discharging_vessel || ''),
          dischargingVoyage: String(lineVesselDetails.discharging_voyage || ''),
          vesselLocalAgent: String(lineVesselDetails.vessel_local_agent || ''),
          vesselType: String(lineVesselDetails.vessel_type || ''),
          vesselBerthedAt: String(lineVesselDetails.vessel_berthed_at || ''),
          icdTransfer: String(lineVesselDetails.icd_transfer || ''),
          icdTransferLocation: String(lineVesselDetails.icd_transfer_location || ''),
          storageFacility: (() => {
            const raw = String(lineVesselDetails.storage_facility || '').toLowerCase()
            if (raw === 'icd' || raw === 'port') return raw as StorageFacility
            return ''
          })(),
          originCountry: String(shipmentDetails.origin_country || ''),
          destinationCountry: String(shipmentDetails.destination_country || ''),
          portOfLoading: String(shipmentDetails.port_of_loading || ''),
          portOfDischarge: String(shipmentDetails.port_of_discharge || ''),
          nominatedBy: String(shipmentDetails.nominated_by || ''),
          marks: String(shipmentDetails.marks || ''),
          shipmentDescription: String(shipmentDetails.description || ''),
          totalNoOfPkgs: String(shipmentDetails.total_no_of_pkgs || ''),
          totalCrWt: String(shipmentDetails.total_cr_wt || ''),
          pono: String(shipmentDetails.po_no || ''),
          currency: String(shipmentDetails.currency || ''),
          fobValue: String(shipmentDetails.fob_value || ''),
          preAssessmentDate: String(shipmentDetails.pre_assessment_date || ''),
          finalAssessmentDate: String(shipmentDetails.final_assessment_date || ''),
          containerShipment:
            containerShipment.length > 0
              ? containerShipment.map((row: any) => ({
                  containerNo: String(row.container_no || ''),
                  type: String(row.type || ''),
                  sealNo: String(row.seal_no || ''),
                  perContainerWeight: String(row.per_container_weight || ''),
                  gateOutDate: String(row.gate_out_date || ''),
                  returnedDate: String(row.returned_date || ''),
                }))
              : prev.containerShipment,
          vehicleShipment:
            vehicleShipment.length > 0
              ? vehicleShipment.map((row: any) => ({
                  chasisNo: String(row.chasis_no || ''),
                  engineCapacity: String(row.engine_capacity || ''),
                  cbm: String(row.cbm || ''),
                  berthingDate: String(row.berthing_date || ''),
                  customReleaseDate: String(row.custom_release_date || ''),
                  driverCellNo: String(row.driver_cell_no || ''),
                  dateOfDeparture: String(row.date_of_departure || ''),
                  dateOfArrivalAtBorder: String(row.date_of_arrival_at_border || ''),
                  dateOfDepartAtBorder: String(row.date_of_depart_at_border || ''),
                  dateOfDelivery: String(row.date_of_delivery || ''),
                }))
              : prev.vehicleShipment,
          looseCargoShipment:
            looseCargoShipment.length > 0
              ? looseCargoShipment.map((row: any) => ({
                  truckNo: String(row.truck_no || ''),
                  trailerNo: String(row.trailer_no || ''),
                  transporter: String(row.transporter || ''),
                  licenceNo: String(row.licence_no || ''),
                  driverName: String(row.driver_name || ''),
                  truckRegCard: String(row.truck_reg_card || ''),
                  trailerRegCard: String(row.trailer_reg_card || ''),
                }))
              : prev.looseCargoShipment,
          shipperId: job.shipper_id ? String(job.shipper_id) : '',
        }))
        if (job.customer_id) {
          setSelectedCustomer({
            value: String(job.customer_id),
            id: Number(job.customer_id),
            name: String(job.customer_name || ''),
            label: String(job.customer_name || `Customer #${job.customer_id}`),
          })
        } else {
          setSelectedCustomer(null)
        }
        const managerId = Number(jobDetails.file_manager_id || 0)
        if (managerId > 0) {
          setSelectedFileManager({
            value: String(managerId),
            id: managerId,
            name: String(jobDetails.file_manager || ''),
            label: String(jobDetails.file_manager || `User #${managerId}`),
          })
        } else {
          setSelectedFileManager(null)
        }
        const uploadCsv =
          meta.upload_csv ??
          (typeof job.upload_csv === 'object' && job.upload_csv !== null ? job.upload_csv : {})
        setCommodityRows(Array.isArray((uploadCsv as { rows?: unknown }).rows) ? (uploadCsv as { rows: CommodityRow[] }).rows : [])
        setUploadedCommodityFiles(
          Array.isArray((uploadCsv as { files?: unknown }).files) ? (uploadCsv as { files: string[] }).files : []
        )
        setAuthorizationLetters(
          Array.isArray(meta.letters) ? meta.letters : Array.isArray(job.letters) ? job.letters : []
        )
        setNotes(Array.isArray(meta.notes) ? meta.notes : Array.isArray(job.notes) ? job.notes : [])
        const loadedJobId = Number(job.id) || editingJobId
        try {
          const docsResponse = await customsJobApi.getJobDocuments(loadedJobId, { per_page: 200 })
          const rows = Array.isArray(docsResponse?.data) ? docsResponse.data : []
          if (!cancelled) {
            setUploadedDocuments(rows.map((row: Record<string, unknown>) => mapJobDocumentRow(row)))
          }
        } catch {
          if (!cancelled) setUploadedDocuments([])
        }
        if (!cancelled) captureBaselineAfterLoad.current = true
      })
      .catch(() => {
        toast.error('Failed to load job details')
      })
      .finally(() => {
        if (!cancelled) setLoadingJob(false)
      })
    return () => {
      cancelled = true
    }
  }, [editingJobId, pageMode, loggedInUser?.id, loggedInUser?.name])

  useEffect(() => {
    if (!loggedInUser) return
    if (pageMode !== 'create') return
    setForm((prev) => ({
      ...prev,
      createdBy: loggedInUser.name || prev.createdBy,
      createdById: String(loggedInUser.id || prev.createdById),
    }))
  }, [pageMode, loggedInUser?.id, loggedInUser?.name])

  const getFirstActiveVoyageForVesselId = (vesselId: string) => {
    const id = Number(vesselId)
    if (!Number.isFinite(id)) return ''
    return (
      vesselVoyages.find((vv) => vv.vesselId === id && vv.status === 'ACTIVE')?.voyage ||
      ''
    )
  }

  const handleLoadingVesselChange = (vesselId: string) => {
    setForm((p) => ({
      ...p,
      loadingVessel: vesselId,
      loadingVoyage: getFirstActiveVoyageForVesselId(vesselId),
    }))
  }

  const handleDischargingVesselChange = (vesselId: string) => {
    setForm((p) => ({
      ...p,
      dischargingVessel: vesselId,
      dischargingVoyage: getFirstActiveVoyageForVesselId(vesselId),
    }))
  }
  const toggleShipmentSection = (section: 'container' | 'vehicle' | 'looseCargo') =>
    setOpenShipmentSections((p) => ({ ...p, [section]: !p[section] }))

  const addContainerRow = () => setForm((p) => ({ ...p, containerShipment: [...p.containerShipment, emptyContainerRow()] }))
  const addVehicleRow = () => setForm((p) => ({ ...p, vehicleShipment: [...p.vehicleShipment, { chasisNo: '', engineCapacity: '', cbm: '', berthingDate: '', customReleaseDate: '', driverCellNo: '', dateOfDeparture: '', dateOfArrivalAtBorder: '', dateOfDepartAtBorder: '', dateOfDelivery: '' }] }))
  const addLooseCargoRow = () => setForm((p) => ({ ...p, looseCargoShipment: [...p.looseCargoShipment, { truckNo: '', trailerNo: '', transporter: '', licenceNo: 'NOT AVAILABLE', driverName: '', truckRegCard: '', trailerRegCard: '' }] }))

  const updateContainerRow = <K extends keyof ContainerShipmentRow>(
    index: number,
    field: K,
    value: ContainerShipmentRow[K]
  ) =>
    setForm((p) => ({
      ...p,
      containerShipment: p.containerShipment.map((r, i) => (i === index ? { ...r, [field]: value } : r)),
    }))
  const updateVehicleRow = (index: number, field: keyof JobForm['vehicleShipment'][number], value: string) =>
    setForm((p) => ({ ...p, vehicleShipment: p.vehicleShipment.map((r, i) => (i === index ? { ...r, [field]: value } : r)) }))
  const updateLooseCargoRow = (index: number, field: keyof JobForm['looseCargoShipment'][number], value: string) =>
    setForm((p) => ({ ...p, looseCargoShipment: p.looseCargoShipment.map((r, i) => (i === index ? { ...r, [field]: value } : r)) }))

  const getJobsPath = () => {
    const currentPath = window.location.pathname.replace(/\/$/, '')
    if (currentPath.endsWith('/create')) {
      return currentPath.replace(/\/create$/, '')
    }
    return currentPath
  }

  const goToJobs = () => {
    if (embedded?.onClose) {
      embedded.onClose()
      return
    }
    window.location.assign(getJobsPath())
  }

  const noteSubjectOptions = ['OUTSTANDING', 'OTHER', 'DELAY NOTIFICATION']

  const resetNoteForm = () => {
    setNoteSubject('')
    setNoteBody('')
  }

  const handleAddNote = () => {
    if (!noteSubject) {
      toast.error('Please select note subject')
      return
    }
    if (!noteBody.trim()) {
      toast.error('Please enter note details')
      return
    }

    const date = new Date().toLocaleDateString()
    setNotes((prev) => [
      ...prev,
      {
        id: Date.now(),
        user: 'Current User',
        subject: noteSubject,
        body: noteBody.trim(),
        date,
      },
    ])
    toast.success('Note added')
    setIsNotesModalOpen(false)
    resetNoteForm()
  }

  const resetUploadModalForm = () => {
    setDocumentName('')
    setDocumentNameOther('')
    setSelectedFile(null)
    setPendingUploads([])
    setDocumentsSearch('')
    setReleaseOrderContainerNo('')
    setReleaseOrderGateOutDate('')
  }

  const handleDocumentFileSelect = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null
    event.target.value = ''
    if (!file) {
      setSelectedFile(null)
      return
    }
    const fileError = validateCustomsDocumentFile(file)
    if (fileError) {
      toast.error(fileError)
      setSelectedFile(null)
      return
    }
    setSelectedFile(file)
  }

  const handleAddPendingUpload = () => {
    const resolvedName = documentName || documentNameOther.trim()
    if (!resolvedName) {
      toast.error('Select document name or enter custom name')
      return
    }
    if (!selectedFile) {
      toast.error('Please choose a file')
      return
    }

    const fileError = validateCustomsDocumentFile(selectedFile)
    if (fileError) {
      toast.error(fileError)
      return
    }

    if (isReleaseOrderDocumentName(resolvedName)) {
      const containerNo = releaseOrderContainerNo.trim()
      if (!containerNo) {
        toast.error('Select the container for this release order')
        return
      }
      if (!releaseOrderGateOutDate) {
        toast.error('Enter the container gate out date')
        return
      }
      const containerIndex = form.containerShipment.findIndex(
        (row) => row.containerNo.trim().toUpperCase() === containerNo.toUpperCase()
      )
      if (containerIndex < 0) {
        toast.error('Selected container was not found on this job')
        return
      }
      updateContainerRow(containerIndex, 'gateOutDate', releaseOrderGateOutDate)
    }

    const fileSizeKb = Math.max(1, Math.round(selectedFile.size / 1024))
    const now = new Date()

    setPendingUploads((prev) => [
      ...prev,
      {
        id: Date.now(),
        name: resolvedName,
        fileName: selectedFile.name,
        fileSize: `${fileSizeKb} KB`,
        date: now.toLocaleDateString(),
        file: selectedFile,
      },
    ])

    setDocumentName('')
    setDocumentNameOther('')
    setSelectedFile(null)
    setReleaseOrderContainerNo('')
    setReleaseOrderGateOutDate('')
  }

  const resolveJobId = () => currentJobId ?? editingJobId

  const syncSavedDocumentSnapshot = (docs: UploadedJobDocumentRow[]) => {
    setSavedSnapshot((prev) => {
      const saved = JSON.parse(prev) as JobEditableSnapshotInput
      return serializeJobEditableState({
        ...saved,
        uploadedDocuments: mapUploadedDocumentSnapshot(docs),
        pendingUploads: [],
      })
    })
  }

  const handleUploadDocuments = async () => {
    if (pendingUploads.length === 0) {
      toast.error('Add at least one document before uploading')
      return
    }

    const jobId = resolveJobId()
    if (!jobId) {
      setUploadedDocuments((prev) => [...prev, ...pendingUploads])
      toast.success(`${pendingUploads.length} document(s) queued — save the job to upload to the server`)
      setIsUploadModalOpen(false)
      resetUploadModalForm()
      return
    }

    setDocumentsUploading(true)
    try {
      const uploadResults: UploadedJobDocumentRow[] = []
      for (const doc of pendingUploads) {
        if (!(doc.file instanceof File)) continue
        const fileError = validateCustomsDocumentFile(doc.file)
        if (fileError) {
          toast.error(fileError)
          return
        }
        const response = await customsJobApi.uploadJobDocument(jobId, {
          document_name: doc.name,
          file: doc.file,
        })
        const uploaded = response?.data
        if (!uploaded) {
          throw new Error('invalid_upload_response')
        }
        uploadResults.push(mapJobDocumentRow(uploaded as Record<string, unknown>))
      }

      const mergedDocuments = [...uploadedDocuments, ...uploadResults]
      setUploadedDocuments(mergedDocuments)
      setPendingUploads([])
      syncSavedDocumentSnapshot(mergedDocuments)
      toast.success(`${uploadResults.length} document(s) uploaded successfully`)
      setIsUploadModalOpen(false)
      setDocumentName('')
      setDocumentNameOther('')
      setSelectedFile(null)
      setDocumentsSearch('')
    } catch {
      toast.error('Failed to upload document(s). Please try again.')
    } finally {
      setDocumentsUploading(false)
    }
  }

  const safeOpenUrl = (url: string) => {
    if (!url) return
    const absoluteUrl = url.startsWith('http') ? url : `${window.location.origin}${url}`
    window.open(absoluteUrl, '_blank', 'noopener,noreferrer')
  }

  const downloadBlob = (blob: Blob, fileName: string) => {
    const objectUrl = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = objectUrl
    anchor.download = fileName || 'document'
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    URL.revokeObjectURL(objectUrl)
  }

  const closeDocumentPreview = () => {
    setIsDocumentPreviewOpen(false)
    setDocumentPreviewUrl('')
    setDocumentPreviewName('')
    setDocumentPreviewMimeType('')
    if (documentPreviewObjectUrl) {
      URL.revokeObjectURL(documentPreviewObjectUrl)
      setDocumentPreviewObjectUrl(null)
    }
  }

  const detectPreviewKind = (mimeType: string, fileName: string): 'pdf' | 'image' | 'other' => {
    const lowerMime = mimeType.toLowerCase()
    const lowerName = fileName.toLowerCase()
    if (lowerMime.includes('pdf') || lowerName.endsWith('.pdf')) return 'pdf'
    if (lowerMime.startsWith('image/') || /\.(png|jpg|jpeg|gif|webp|bmp|svg)$/.test(lowerName)) return 'image'
    return 'other'
  }

  const handlePreviewDocument = (doc: {
    fileName: string
    file?: File
    fileUrl?: string
    mimeType?: string
  }) => {
    const resolvedMimeType = doc.mimeType || doc.file?.type || ''
    const resolvedFileName = doc.fileName || doc.file?.name || 'document'

    if (doc.fileUrl) {
      const absoluteUrl = doc.fileUrl.startsWith('http')
        ? doc.fileUrl
        : `${window.location.origin}${doc.fileUrl}`
      setDocumentPreviewUrl(absoluteUrl)
      setDocumentPreviewName(resolvedFileName)
      setDocumentPreviewMimeType(resolvedMimeType)
      setIsDocumentPreviewOpen(true)
      return
    }

    if (doc.file) {
      const objectUrl = URL.createObjectURL(doc.file)
      setDocumentPreviewUrl(objectUrl)
      setDocumentPreviewName(resolvedFileName)
      setDocumentPreviewMimeType(resolvedMimeType)
      setDocumentPreviewObjectUrl(objectUrl)
      setIsDocumentPreviewOpen(true)
      return
    }
    toast.error('No document source found')
  }

  const handleDownloadDocument = async (doc: {
    fileName: string
    file?: File
    fileUrl?: string
  }) => {
    if (doc.file) {
      downloadBlob(doc.file, doc.fileName)
      return
    }
    if (doc.fileUrl) {
      try {
        const response = await fetch(doc.fileUrl)
        if (!response.ok) throw new Error('download_failed')
        const blob = await response.blob()
        downloadBlob(blob, doc.fileName)
      } catch {
        safeOpenUrl(doc.fileUrl)
      }
      return
    }
    toast.error('No document source found')
  }

  const fetchJobDocuments = async (jobId: number): Promise<UploadedJobDocumentRow[]> => {
    setDocumentsLoading(true)
    try {
      const response = await customsJobApi.getJobDocuments(jobId, { per_page: 200 })
      const rows = Array.isArray(response?.data) ? response.data : []
      const mapped = rows.map((row: Record<string, unknown>) => mapJobDocumentRow(row))
      setUploadedDocuments(mapped)
      return mapped
    } catch {
      toast.error('Failed to load uploaded documents')
      return []
    } finally {
      setDocumentsLoading(false)
    }
  }

  const handleDeleteDocument = async (row: { id: number; filePath?: string }) => {
    if (currentJobId && row.filePath) {
      try {
        await customsJobApi.deleteJobDocument(currentJobId, row.id)
        setUploadedDocuments((prev) => prev.filter((item) => item.id !== row.id))
        toast.success('Document deleted')
      } catch {
        toast.error('Failed to delete document')
      }
      return
    }

    setUploadedDocuments((prev) => prev.filter((item) => item.id !== row.id))
  }

  const normalizeCommodityField = (value: unknown): string => {
    if (value === null || value === undefined) return ''
    return String(value).trim()
  }

  const mapCommodityRecord = (record: Record<string, unknown>, index: number): CommodityRow => {
    const get = (keys: string[]) => {
      for (const key of keys) {
        if (record[key] !== undefined) return normalizeCommodityField(record[key])
      }
      return ''
    }

    return {
      itemNo: get(['Item No.', 'Item No', 'item_no', 'itemNo']) || String(index + 1),
      commodityCode: get(['CommodityCode', 'Commodity Code', 'commodity_code', 'commodityCode']),
      desc: get(['Desc.', 'Desc', 'Description', 'desc']),
      modeSpecification: get(['Mode/Specification', 'Mode Specification', 'mode_specification', 'modeSpecification']),
      component: get(['Component', 'component']),
      quantity: get(['Quantity', 'quantity']),
      unitPrice: get(['Unit Price', 'unit_price', 'unitPrice']),
      itemInvPrice: get(['Item Inv.Price.', 'Item Inv.Price', 'item_inv_price', 'itemInvPrice']),
    }
  }

  const applyCommodityRows = (rows: CommodityRow[], sourceName: string) => {
    if (rows.length === 0) {
      toast.error('No commodity rows found in file')
      return
    }
    setCommodityRows(rows)
    setUploadedCommodityFiles((prev) => [sourceName, ...prev.filter((n) => n !== sourceName)])
    toast.success(`Loaded ${rows.length} commodity row(s) from ${sourceName}`)
  }

  const parseCsvFile = (file: File) => {
    const reader = new FileReader()
    reader.onload = (event) => {
      const text = String(event.target?.result || '')
      const workbook = XLSX.read(text, { type: 'string' })
      const firstSheet = workbook.SheetNames[0]
      if (!firstSheet) {
        toast.error('CSV file has no worksheet')
        return
      }
      const records = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[firstSheet], {
        defval: '',
      })
      const mapped = records.map((r, i) => mapCommodityRecord(r, i))
      applyCommodityRows(mapped, file.name)
    }
    reader.onerror = () => toast.error('Failed to read CSV file')
    reader.readAsText(file)
  }

  const parseExcelFile = (file: File) => {
    const reader = new FileReader()
    reader.onload = (event) => {
      const data = event.target?.result
      if (!data) {
        toast.error('Failed to read Excel file')
        return
      }
      const workbook = XLSX.read(data, { type: 'array' })
      const firstSheet = workbook.SheetNames[0]
      if (!firstSheet) {
        toast.error('Excel file has no worksheet')
        return
      }
      const records = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[firstSheet], {
        defval: '',
      })
      const mapped = records.map((r, i) => mapCommodityRecord(r, i))
      applyCommodityRows(mapped, file.name)
    }
    reader.onerror = () => toast.error('Failed to read Excel file')
    reader.readAsArrayBuffer(file)
  }

  const handleCsvFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    parseCsvFile(file)
    e.target.value = ''
  }

  const handleExcelFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    parseExcelFile(file)
    e.target.value = ''
  }

  const handleSave = async () => {
    if (isSaving) return
    if (!form.customerId) {
      toast.error('Customer is required')
      return
    }

    // Shipments created from the UI are persisted both to backend and localStorage (until list/workflow pages are fully API-driven).
    const shipperDetails = {
      supplierName: form.supplierName,
      supplierAddress: form.supplierAddress,
      consigneeName: form.consigneeName,
      consigneeAddress: form.consigneeAddress,
      notifyPartyName: form.notifyPartyName,
      notifyAddress: form.notifyAddress,
    }

    const lineVesselDetails = {
      shipping_line: form.shippingLine || null,
      arrival_date: form.arrivalDate || null,
      berthing_date: form.berthingDate || null,
      carrying_date: form.carryingDate || null,
      discharge_date: form.dischargeDate || null,
      loading_vessel: form.loadingVessel || null,
      loading_voyage: form.loadingVoyage || null,
      discharging_vessel: form.dischargingVessel || null,
      discharging_voyage: form.dischargingVoyage || null,
      vessel_local_agent: form.vesselLocalAgent || null,
      vessel_type: form.vesselType || null,
      vessel_berthed_at: form.vesselBerthedAt || null,
      icd_transfer: form.icdTransfer || null,
      icd_transfer_location: form.icdTransferLocation || null,
      storage_facility: resolvedStorageFacility,
    }

    const shipmentDetails = {
      origin_country: form.originCountry || null,
      destination_country: form.destinationCountry || null,
      port_of_loading: form.portOfLoading || null,
      port_of_discharge: form.portOfDischarge || null,
      nominated_by: form.nominatedBy || null,
      marks: form.marks || null,
      description: form.shipmentDescription || null,
      total_no_of_pkgs: form.totalNoOfPkgs || null,
      total_cr_wt: form.totalCrWt || null,
      po_no: form.pono || null,
      currency: form.currency || null,
      fob_value: form.fobValue || null,
      pre_assessment_date: form.preAssessmentDate || null,
      final_assessment_date: form.finalAssessmentDate || null,
    }

    const jobDetails = {
      customer_ref_no: form.customerRefNo || null,
      reference_no: form.referenceNo || null,
      cargo_type: form.cargoType || null,
      type_of_cargo: form.typeOfCargo || null,
      ucr_no: form.ucrNo || null,
      tansad_no: form.tansadNo || null,
      idf_tansad_date: form.idfTansadDate || null,
      file_manager: form.fileManager || null,
      file_manager_id: form.fileManagerId ? Number(form.fileManagerId) : null,
      created_by: loggedInUser?.name || form.createdBy || null,
      created_by_id: loggedInUser?.id || (form.createdById ? Number(form.createdById) : null),
    }

    const containerShipment = form.containerShipment.map((row) => ({
      container_no: row.containerNo || null,
      type: row.type || null,
      seal_no: row.sealNo || null,
      per_container_weight: row.perContainerWeight || null,
      gate_out_date: row.gateOutDate || null,
      returned_date: row.returnedDate || null,
    }))

    const vehicleShipment = form.vehicleShipment.map((row) => ({
      chasis_no: row.chasisNo || null,
      engine_capacity: row.engineCapacity || null,
      cbm: row.cbm || null,
      berthing_date: row.berthingDate || null,
      custom_release_date: row.customReleaseDate || null,
      driver_cell_no: row.driverCellNo || null,
      date_of_departure: row.dateOfDeparture || null,
      date_of_arrival_at_border: row.dateOfArrivalAtBorder || null,
      date_of_depart_at_border: row.dateOfDepartAtBorder || null,
      date_of_delivery: row.dateOfDelivery || null,
    }))

    const looseCargoShipment = form.looseCargoShipment.map((row) => ({
      truck_no: row.truckNo || null,
      trailer_no: row.trailerNo || null,
      transporter: row.transporter || null,
      licence_no: row.licenceNo || null,
      driver_name: row.driverName || null,
      truck_reg_card: row.truckRegCard || null,
      trailer_reg_card: row.trailerRegCard || null,
    }))

    const shipperIdNum = form.shipperId ? Number(form.shipperId) : NaN
    const shipper_id =
      Number.isFinite(shipperIdNum) && shipperIdNum > 0 ? shipperIdNum : null

    const payload = {
      customer_id: Number(form.customerId),
      customer_name: form.customerName.trim(),
      shipment_type: form.shipmentType,
      shipper_id,
      mbl_no: form.mblNo.trim() || null,
      hbl_no: form.hblNo.trim() || null,
      invoice_no: form.invoiceNo.trim() || null,
      date_of_receipt: form.dateOfReceipt || null,
      status: form.status,
      line_vessel_details: lineVesselDetails,
      shipment_details: shipmentDetails,
      container_shipment: containerShipment,
      vehicle_shipment: vehicleShipment,
      loose_cargo_shipment: looseCargoShipment,
      documents: uploadedDocuments.map((doc) => ({
        id: doc.id,
        name: doc.name,
        fileName: doc.fileName,
        fileSize: doc.fileSize,
        date: doc.date,
        filePath: doc.filePath || null,
        fileUrl: doc.fileUrl || null,
      })),
      upload_csv: {
        search: commoditySearch,
        rows: commodityRows,
        files: uploadedCommodityFiles,
      },
      letters: authorizationLetters,
      notes: notes,
      meta: {
        job_details: jobDetails,
        shipper_id,
        shipperDetails,
        line_vessel_details: lineVesselDetails,
        shipment_details: shipmentDetails,
        container_shipment: containerShipment,
        vehicle_shipment: vehicleShipment,
        loose_cargo_shipment: looseCargoShipment,
        documents: uploadedDocuments.map((doc) => ({
          id: doc.id,
          name: doc.name,
          fileName: doc.fileName,
          fileSize: doc.fileSize,
          date: doc.date,
          filePath: doc.filePath || null,
          fileUrl: doc.fileUrl || null,
        })),
        upload_csv: {
          search: commoditySearch,
          rows: commodityRows,
          files: uploadedCommodityFiles,
        },
        letters: authorizationLetters,
        notes: notes,
      },
    }

    setIsSaving(true)
    try {
      const res =
        pageMode === 'update' && editingJobId
          ? await customsJobApi.updateJob(editingJobId, payload)
          : await customsJobApi.createJob(payload)
      const serverJob = res?.data
      if (!serverJob) {
        throw new Error('Invalid create job response')
      }

      setCurrentJobId(serverJob.id)

      const docsToUpload = uploadedDocuments.filter((doc) => doc.file instanceof File)
      if (docsToUpload.length > 0) {
        for (const doc of docsToUpload) {
          const fileError = validateCustomsDocumentFile(doc.file as File)
          if (fileError) {
            toast.error(fileError)
            return
          }
        }
        await Promise.all(
          docsToUpload.map(async (doc) => {
            await customsJobApi.uploadJobDocument(serverJob.id, {
              document_name: doc.name,
              file: doc.file as File,
            })
          })
        )
      }

      const savedDocsForSnapshot = await fetchJobDocuments(serverJob.id)

      setPendingUploads([])

      const job: Job = {
        id: serverJob.id,
        jobNo: serverJob.job_no || `JOB-${Date.now().toString().slice(-6)}`,
        customerName: serverJob.customer_name || form.customerName.trim(),
        shipmentType: serverJob.shipment_type || form.shipmentType,
        mblNo: serverJob.mbl_no || '',
        hblNo: serverJob.hbl_no || '',
        invoiceNo: serverJob.invoice_no || '',
        status: serverJob.status || form.status,
        stageProgress: serverJob.stage_progress || createInitialJobStageProgress(),
        stageAssignments: serverJob.stage_assignments || createInitialJobStageAssignments(),
        meta: serverJob.meta || {
          job_details: jobDetails,
          shipper_id,
          shipperDetails,
          line_vessel_details: lineVesselDetails,
          shipment_details: shipmentDetails,
          container_shipment: containerShipment,
          vehicle_shipment: vehicleShipment,
          loose_cargo_shipment: looseCargoShipment,
          documents: savedDocsForSnapshot.map((doc) => ({
            id: doc.id,
            name: doc.name,
            fileName: doc.fileName,
            fileSize: doc.fileSize,
            date: doc.date,
            filePath: doc.filePath || null,
            fileUrl: doc.fileUrl || null,
          })),
          upload_csv: {
            search: commoditySearch,
            rows: commodityRows,
            files: uploadedCommodityFiles,
          },
          letters: authorizationLetters,
          notes: notes,
        },
        dateOfReceipt: serverJob.date_of_receipt || '-',
        createdAt: serverJob.created_at || new Date().toISOString(),
      }

      prependStoredJob(job)
      toast.success(pageMode === 'update' ? 'Job saved successfully' : 'Job created successfully')
      setSavedSnapshot(
        serializeJobEditableState({
          form,
          commoditySearch,
          commodityRows,
          uploadedCommodityFiles,
          authorizationLetters,
          notes,
          uploadedDocuments: mapUploadedDocumentSnapshot(savedDocsForSnapshot),
          pendingUploads: [],
        })
      )
      if (pageMode !== 'update') {
        goToJobs()
      }
    } catch {
      toast.error(
        pageMode === 'update'
          ? 'Failed to update job. Please try again.'
          : 'Failed to create job. Please try again.'
      )
    } finally {
      setIsSaving(false)
    }
  }

  const shipmentTypeItems = useMemo(
    () => shipmentTypeOptions.filter((v) => typeof v === 'string' && v.trim() !== ''),
    [shipmentTypeOptions]
  )
  const cargoTypeItems = useMemo(
    () => cargoTypeOptions.filter((v) => typeof v === 'string' && v.trim() !== ''),
    [cargoTypeOptions]
  )
  const typeOfCargoItems = useMemo(
    () => typeOfCargoOptions.filter((v) => typeof v === 'string' && v.trim() !== ''),
    [typeOfCargoOptions]
  )

  const labelForShipmentType = (value: string) =>
    value === 'POST_ENTRY' ? 'POST ENTRY' : value

  useEffect(() => {
    let cancelled = false
    customsJobApi
      .getFormOptions()
      .then((opts) => {
        if (cancelled) return
        if (Array.isArray(opts.shipment_types) && opts.shipment_types.length) {
          setShipmentTypeOptions(opts.shipment_types)
        }
        if (Array.isArray(opts.cargo_types) && opts.cargo_types.length) {
          setCargoTypeOptions(opts.cargo_types)
        }
        if (Array.isArray(opts.type_of_cargo) && opts.type_of_cargo.length) {
          setTypeOfCargoOptions(opts.type_of_cargo)
        }
      })
      .catch(() => {
        // axios interceptor already toasts; keep fallback options
      })
    return () => {
      cancelled = true
    }
  }, [])

  const jobDetailsCard = (
      <Card>
        <CardHeader>
          <CardTitle>Job Details</CardTitle>
          <CardDescription>
            {loadingJob ? 'Fetching job data…' : 'Use tabs to complete the shipment information.'}
          </CardDescription>
        </CardHeader>
        <CardContent className='space-y-4'>
          {loadingJob ? (
            <JobFormSkeleton />
          ) : (
          <>
          {/* Header fields: disabled in view mode; separate from tabs so tab triggers stay clickable */}
          <fieldset
            disabled={isSaving || isViewMode || loadingJob}
            className='space-y-4 border-0 p-0 m-0 min-w-0'
          >
          <div className='grid grid-cols-1 gap-3 md:grid-cols-4'>
            <div className='space-y-1'><Label>MBL No.</Label><Input value={form.mblNo} onChange={(e) => updateField('mblNo', e.target.value)} /></div>
            <div className='space-y-1'>
              <Label>Customer</Label>
              <AsyncSelect<CustomerOption>
                value={selectedCustomer}
                loadOptions={loadCustomerOptions}
                onChange={(option) => {
                  const selected = option || null
                  setSelectedCustomer(selected)
                  updateField('customerId', selected ? String(selected.id) : '')
                  updateField('customerName', selected?.name ?? '')
                }}
                placeholder='Type customer name...'
                isDisabled={formDisabled}
                isClearable
                noOptionsMessage={({ inputValue }) =>
                  inputValue.length < 2 ? 'Type at least 2 characters' : 'No customers found'
                }
                loadingMessage={() => 'Searching customers...'}
                className='react-select-container'
                classNamePrefix='react-select'
                styles={{
                  control: (base, state) => ({
                    ...base,
                    minHeight: '36px',
                    height: '36px',
                    borderColor: state.isFocused ? 'hsl(var(--ring))' : '#E2E8F1',
                    backgroundColor: 'transparent',
                    borderRadius: 'calc(var(--radius) - 2px)',
                    borderWidth: '1px',
                    boxShadow: state.isFocused
                      ? '0 0 0 3px hsl(var(--ring) / 0.5)'
                      : '0 1px 2px 0 rgb(0 0 0 / 0.05)',
                    '&:hover': {
                      borderColor: state.isFocused ? 'hsl(var(--ring))' : '#E2E8F1',
                    },
                  }),
                  placeholder: (base) => ({
                    ...base,
                    color: 'hsl(var(--muted-foreground))',
                    fontSize: '0.875rem',
                  }),
                  input: (base) => ({
                    ...base,
                    color: 'hsl(var(--foreground))',
                    fontSize: '0.875rem',
                    margin: 0,
                    padding: 0,
                  }),
                  singleValue: (base) => ({
                    ...base,
                    color: 'hsl(var(--foreground))',
                    fontSize: '0.875rem',
                  }),
                  menu: (base) => ({
                    ...base,
                    backgroundColor: '#ffffff',
                    border: '1px solid #e5e7eb',
                    borderRadius: 'calc(var(--radius) - 2px)',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
                    zIndex: 50,
                  }),
                  menuList: (base) => ({
                    ...base,
                    padding: '0.25rem',
                  }),
                  option: (base, state) => ({
                    ...base,
                    backgroundColor: state.isFocused || state.isSelected ? '#f3f4f6' : '#ffffff',
                    color: '#111827',
                    fontSize: '0.875rem',
                    padding: '0.375rem 0.5rem',
                    borderRadius: 'calc(var(--radius) - 4px)',
                    cursor: 'pointer',
                    '&:active': {
                      backgroundColor: '#e5e7eb',
                    },
                    '&:hover': {
                      backgroundColor: '#f3f4f6',
                    },
                  }),
                  indicatorSeparator: () => ({
                    display: 'none',
                  }),
                  dropdownIndicator: (base) => ({
                    ...base,
                    color: 'hsl(var(--muted-foreground))',
                    padding: '0 8px',
                    '&:hover': {
                      color: 'hsl(var(--foreground))',
                    },
                  }),
                  clearIndicator: (base) => ({
                    ...base,
                    color: 'hsl(var(--muted-foreground))',
                    padding: '0 8px',
                    '&:hover': {
                      color: 'hsl(var(--foreground))',
                    },
                  }),
                }}
              />
            </div>
            <div className='space-y-1'><Label>Date of Receipt</Label><Input type='date' value={form.dateOfReceipt} onChange={(e) => updateField('dateOfReceipt', e.target.value)} /></div>
            <div className='space-y-1'><Label>Reference No.</Label><Input value={form.referenceNo} onChange={(e) => updateField('referenceNo', e.target.value)} /></div>
            <div className='space-y-1'><Label>HBL/FBO No.</Label><Input value={form.hblNo} onChange={(e) => updateField('hblNo', e.target.value)} /></div>
            <div className='space-y-1'><Label>Customer Ref No.</Label><Input value={form.customerRefNo} onChange={(e) => updateField('customerRefNo', e.target.value)} /></div>
            <div className='space-y-1'><Label>Cargo Type</Label><Select disabled={formDisabled} value={form.cargoType} onValueChange={(v) => updateField('cargoType', v)}><SelectTrigger className='w-full'><SelectValue /></SelectTrigger><SelectContent>{cargoTypeItems.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select></div>
            <div className='space-y-1'><Label>Type of Cargo</Label><Select disabled={formDisabled} value={form.typeOfCargo} onValueChange={(v) => updateField('typeOfCargo', v)}><SelectTrigger className='w-full'><SelectValue /></SelectTrigger><SelectContent>{typeOfCargoItems.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select></div>
            <div className='space-y-1'><Label>Invoice No.</Label><Input value={form.invoiceNo} onChange={(e) => updateField('invoiceNo', e.target.value)} /></div>
            <div className='space-y-1'><Label>UCR No.</Label><Input value={form.ucrNo} onChange={(e) => updateField('ucrNo', e.target.value)} /></div>
            <div className='space-y-1'><Label>TANSAD No</Label><Input value={form.tansadNo} onChange={(e) => updateField('tansadNo', e.target.value)} /></div>
            <div className='space-y-1'><Label>IDF/TANSAD Date</Label><Input type='date' value={form.idfTansadDate} onChange={(e) => updateField('idfTansadDate', e.target.value)} /></div>
            <div className='space-y-1'>
              <Label>File Manager</Label>
              <AsyncSelect<FileManagerOption>
                value={selectedFileManager}
                loadOptions={loadFileManagerOptions}
                defaultOptions={fileManagerSeedOptions}
                cacheOptions
                onChange={(option) => {
                  const selected = option || null
                  setSelectedFileManager(selected)
                  updateField('fileManagerId', selected ? String(selected.id) : '')
                  updateField('fileManager', selected?.name ?? '')
                }}
                placeholder='Type staff.'
                isDisabled={formDisabled}
                isClearable
                noOptionsMessage={() => 'No staff found'}
                loadingMessage={() => 'Searching staff...'}
                className='react-select-container'
                classNamePrefix='react-select'
                styles={{
                  control: (base, state) => ({
                    ...base,
                    minHeight: '36px',
                    height: '36px',
                    borderColor: state.isFocused ? 'hsl(var(--ring))' : '#E2E8F1',
                    backgroundColor: 'transparent',
                    borderRadius: 'calc(var(--radius) - 2px)',
                    borderWidth: '1px',
                    boxShadow: state.isFocused
                      ? '0 0 0 3px hsl(var(--ring) / 0.5)'
                      : '0 1px 2px 0 rgb(0 0 0 / 0.05)',
                    '&:hover': {
                      borderColor: state.isFocused ? 'hsl(var(--ring))' : '#E2E8F1',
                    },
                  }),
                  placeholder: (base) => ({
                    ...base,
                    color: 'hsl(var(--muted-foreground))',
                    fontSize: '0.875rem',
                  }),
                  input: (base) => ({
                    ...base,
                    color: 'hsl(var(--foreground))',
                    fontSize: '0.875rem',
                    margin: 0,
                    padding: 0,
                  }),
                  singleValue: (base) => ({
                    ...base,
                    color: 'hsl(var(--foreground))',
                    fontSize: '0.875rem',
                  }),
                  menu: (base) => ({
                    ...base,
                    backgroundColor: '#ffffff',
                    border: '1px solid #e5e7eb',
                    borderRadius: 'calc(var(--radius) - 2px)',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
                    zIndex: 50,
                  }),
                  menuList: (base) => ({
                    ...base,
                    padding: '0.25rem',
                  }),
                  option: (base, state) => ({
                    ...base,
                    backgroundColor: state.isFocused || state.isSelected ? '#f3f4f6' : '#ffffff',
                    color: '#111827',
                    fontSize: '0.875rem',
                    padding: '0.375rem 0.5rem',
                    borderRadius: 'calc(var(--radius) - 4px)',
                    cursor: 'pointer',
                    '&:active': {
                      backgroundColor: '#e5e7eb',
                    },
                    '&:hover': {
                      backgroundColor: '#f3f4f6',
                    },
                  }),
                  indicatorSeparator: () => ({
                    display: 'none',
                  }),
                  dropdownIndicator: (base) => ({
                    ...base,
                    color: 'hsl(var(--muted-foreground))',
                    padding: '0 8px',
                    '&:hover': {
                      color: 'hsl(var(--foreground))',
                    },
                  }),
                  clearIndicator: (base) => ({
                    ...base,
                    color: 'hsl(var(--muted-foreground))',
                    padding: '0 8px',
                    '&:hover': {
                      color: 'hsl(var(--foreground))',
                    },
                  }),
                }}
              />
            </div>
            <div className='space-y-1'><Label>Created By</Label><Input value={form.createdBy} disabled /></div>
            <div className='space-y-1'><Label>Shipment Type</Label><Select disabled={formDisabled} value={form.shipmentType} onValueChange={(v) => updateField('shipmentType', v)}><SelectTrigger className='w-full'><SelectValue /></SelectTrigger><SelectContent>{shipmentTypeItems.map((v) => <SelectItem key={v} value={v}>{labelForShipmentType(v)}</SelectItem>)}</SelectContent></Select></div>
          </div>
          </fieldset>

          <Tabs defaultValue='shipper' className='w-full pt-[10px]'>
            <TabsList className='grid w-full grid-cols-3 md:grid-cols-7'>
              <TabsTrigger value='shipper'>Shipper Details</TabsTrigger>
              <TabsTrigger value='line-vessel'>Line/Vessel</TabsTrigger>
              <TabsTrigger value='shipment'>Shipment Details</TabsTrigger>
              <TabsTrigger value='documents'>Documents</TabsTrigger>
              <TabsTrigger value='upload'>Upload CSV</TabsTrigger>
              <TabsTrigger value='letters'>Letters</TabsTrigger>
              <TabsTrigger value='notes'>Notes</TabsTrigger>
            </TabsList>

            <TabsContent value='shipper' className='space-y-3 rounded-md border p-4'>
              <fieldset disabled={formDisabled} className='min-w-0 border-0 p-0 m-0'>
              <div className='grid grid-cols-1 gap-3 md:grid-cols-2'>
                <div className='space-y-1 md:col-span-2'>
                  <Label>Master shipper (optional)</Label>
                  <Select
                    disabled={formDisabled}
                    value={form.shipperId || '__none__'}
                    onValueChange={(v) => updateField('shipperId', v === '__none__' ? '' : v)}
                  >
                    <SelectTrigger className='w-full'>
                      <SelectValue placeholder='Select shipper master record' />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='__none__'>None</SelectItem>
                      {shipperOptions.map((s) => (
                        <SelectItem key={s.id} value={String(s.id)}>
                          {s.name}
                          {s.city ? ` — ${s.city}` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className='space-y-1'><Label>Supplier Name</Label><Input value={form.supplierName} onChange={(e) => updateField('supplierName', e.target.value)} /></div>
                <div className='space-y-1'><Label>Supplier Address</Label><Textarea value={form.supplierAddress} onChange={(e) => updateField('supplierAddress', e.target.value)} /></div>
                <div className='space-y-1'><Label>Consignee Name</Label><Input value={form.consigneeName} onChange={(e) => updateField('consigneeName', e.target.value)} /></div>
                <div className='space-y-1'><Label>Consignee Address</Label><Textarea value={form.consigneeAddress} onChange={(e) => updateField('consigneeAddress', e.target.value)} /></div>
                <div className='space-y-1'><Label>Notify Party Name</Label><Input value={form.notifyPartyName} onChange={(e) => updateField('notifyPartyName', e.target.value)} /></div>
                <div className='space-y-1'><Label>Notify Address</Label><Textarea value={form.notifyAddress} onChange={(e) => updateField('notifyAddress', e.target.value)} /></div>
              </div>
              </fieldset>
            </TabsContent>

            <TabsContent value='line-vessel' className='space-y-3 rounded-md border p-4'>
              <fieldset disabled={formDisabled} className='min-w-0 border-0 p-0 m-0'>
              <div className='grid grid-cols-1 gap-3 md:grid-cols-4'>
                <div className='space-y-1'>
                  <Label>Shipping Line</Label>
                  <Select
                    disabled={formDisabled}
                    value={form.shippingLine.trim() ? form.shippingLine : '__none__'}
                    onValueChange={(v) => updateField('shippingLine', v === '__none__' ? '' : v)}
                  >
                    <SelectTrigger className='w-full'>
                      <SelectValue placeholder='Select shipping line (from shippers)' />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='__none__'>None</SelectItem>
                      {shippingLineSelectOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className='space-y-1'>
                  <Label>Arrival Date</Label>
                  <Input
                    type='date'
                    value={form.arrivalDate}
                    onChange={(e) => updateField('arrivalDate', e.target.value)}
                  />
                </div>
                <div className='space-y-1'>
                  <Label>Berthing Date</Label>
                  <Input
                    type='date'
                    value={form.berthingDate}
                    onChange={(e) => updateField('berthingDate', e.target.value)}
                  />
                </div>
                <div className='space-y-1'>
                  <Label>Discharge Date</Label>
                  <Input
                    type='date'
                    value={form.dischargeDate}
                    onChange={(e) => updateField('dischargeDate', e.target.value)}
                  />
                </div>

                <div className='space-y-1 md:col-span-2'>
                  <Label>Loading Vessel</Label>
                  <Select disabled={formDisabled} value={form.loadingVessel || '__empty__'} onValueChange={handleLoadingVesselChange}>
                    <SelectTrigger className='w-full'>
                      <SelectValue placeholder='Select loading vessel' />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='__empty__'>SELECT</SelectItem>
                      {vessels.map((v) => (
                        <SelectItem key={v.id} value={String(v.id)}>
                          {v.vesselName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className='space-y-1 md:col-span-2'>
                  <Label>Voyage</Label>
                  <Input value={form.loadingVoyage} disabled />
                </div>

                <div className='space-y-1 md:col-span-2'>
                  <Label>Discharging Vessel</Label>
                  <Select
                    disabled={formDisabled}
                    value={form.dischargingVessel || '__empty__'}
                    onValueChange={handleDischargingVesselChange}
                  >
                    <SelectTrigger className='w-full'>
                      <SelectValue placeholder='Select discharging vessel' />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='__empty__'>SELECT</SelectItem>
                      {vessels.map((v) => (
                        <SelectItem key={v.id} value={String(v.id)}>
                          {v.vesselName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className='space-y-1 md:col-span-2'>
                  <Label>Voyage</Label>
                  <Input value={form.dischargingVoyage} disabled />
                </div>

                <div className='space-y-1 md:col-span-2'>
                  <Label>Vessel/Local Agent</Label>
                  <Input
                    value={form.vesselLocalAgent}
                    onChange={(e) => updateField('vesselLocalAgent', e.target.value)}
                  />
                </div>
                <div className='space-y-1'>
                  <Label>Type</Label>
                  <Select
                    disabled={formDisabled}
                    value={form.vesselType || '__empty__'}
                    onValueChange={(v) => updateField('vesselType', v)}
                  >
                    <SelectTrigger className='w-full'>
                      <SelectValue placeholder='Select type' />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='Direct'>Direct</SelectItem>
                      <SelectItem value='Transshipment'>Transshipment</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className='space-y-1'>
                  <Label>Vessel Berthed At</Label>
                  <Input
                    type='date'
                    value={form.vesselBerthedAt}
                    onChange={(e) => updateField('vesselBerthedAt', e.target.value)}
                  />
                </div>

                <div className='space-y-1'>
                  <Label>ICD Transfer</Label>
                  <Select
                    disabled={formDisabled}
                    value={form.icdTransfer || '__empty__'}
                    onValueChange={(v) => updateField('icdTransfer', v)}
                  >
                    <SelectTrigger className='w-full'>
                      <SelectValue placeholder='Select' />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='NO'>No</SelectItem>
                      <SelectItem value='YES'>Yes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className='space-y-1'>
                  <Label>Carrying Date</Label>
                  <Input
                    type='date'
                    value={form.carryingDate}
                    onChange={(e) => updateField('carryingDate', e.target.value)}
                  />
                </div>

                <div className='space-y-1 md:col-span-2'>
                  <Label>ICD Transfer Location</Label>
                  <Select
                    disabled={formDisabled}
                    value={form.icdTransferLocation.trim() ? form.icdTransferLocation : '__none__'}
                    onValueChange={(v) => updateField('icdTransferLocation', v === '__none__' ? '' : v)}
                  >
                    <SelectTrigger className='w-full'>
                      <SelectValue placeholder='Select ICD location' />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='__none__'>None</SelectItem>
                      {icdTransferLocationSelectOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className='space-y-1 md:col-span-2'>
                  <Label>Storage Location (charges)</Label>
                  <Select
                    disabled={formDisabled}
                    value={form.storageFacility || resolvedStorageFacility}
                    onValueChange={(v) => updateField('storageFacility', v as StorageFacility)}
                  >
                    <SelectTrigger className='w-full'>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='icd'>ICD (7-day grace)</SelectItem>
                      <SelectItem value='port'>Port — TPA / DP World (5-day grace)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className='text-xs text-muted-foreground'>
                    Used with Carrying Date for storage accrual. Defaults from ICD transfer when not set.
                  </p>
                </div>
              </div>
              </fieldset>
            </TabsContent>

            <TabsContent value='shipment' className='space-y-3 rounded-md border p-4'>
              <fieldset disabled={formDisabled} className='min-w-0 border-0 p-0 m-0'>
              <div className='grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4'>
                <div className='space-y-1'>
                  <Label>Origin Country</Label>
                  <Select
                    disabled={formDisabled}
                    value={form.originCountry.trim() ? form.originCountry : '__none__'}
                    onValueChange={(v) => {
                      if (v === '__none__') {
                        updateField('originCountry', '')
                        updateField('portOfLoading', '')
                        return
                      }
                      updateField('originCountry', v)
                      updateField('portOfLoading', '')
                    }}
                  >
                    <SelectTrigger className='w-full'>
                      <SelectValue placeholder='Select origin country' />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='__none__'>None</SelectItem>
                      {originCountrySelectOptions.map((opt) => (
                        <SelectItem key={`oc-${opt.value}`} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className='space-y-1'>
                  <Label>Port Of Loading</Label>
                  <Select
                    value={form.portOfLoading.trim() ? form.portOfLoading : '__none__'}
                    onValueChange={(v) => updateField('portOfLoading', v === '__none__' ? '' : v)}
                    disabled={formDisabled || !originCountryId}
                  >
                    <SelectTrigger className='w-full'>
                      <SelectValue
                        placeholder={
                          originCountryId ? 'Select port' : 'Choose origin country first'
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='__none__'>None</SelectItem>
                      {portLoadingSelectOptions.map((opt) => (
                        <SelectItem key={`pl-${opt.value}`} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className='space-y-1'>
                  <Label>Destination Country</Label>
                  <Select
                    disabled={formDisabled}
                    value={form.destinationCountry.trim() ? form.destinationCountry : '__none__'}
                    onValueChange={(v) => {
                      if (v === '__none__') {
                        updateField('destinationCountry', '')
                        updateField('portOfDischarge', '')
                        return
                      }
                      updateField('destinationCountry', v)
                      updateField('portOfDischarge', '')
                    }}
                  >
                    <SelectTrigger className='w-full'>
                      <SelectValue placeholder='e.g. Tanzania' />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='__none__'>None</SelectItem>
                      {destinationCountrySelectOptions.map((opt) => (
                        <SelectItem key={`dc-${opt.value}`} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className='space-y-1'>
                  <Label>Port Of Discharge</Label>
                  <Select
                    value={form.portOfDischarge.trim() ? form.portOfDischarge : '__none__'}
                    onValueChange={(v) => updateField('portOfDischarge', v === '__none__' ? '' : v)}
                    disabled={formDisabled || !destinationCountryId}
                  >
                    <SelectTrigger className='w-full'>
                      <SelectValue
                        placeholder={
                          destinationCountryId ? 'Select port' : 'Choose destination country first'
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='__none__'>None</SelectItem>
                      {portDischargeSelectOptions.map((opt) => (
                        <SelectItem key={`pd-${opt.value}`} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className='space-y-1 md:col-span-2 lg:col-span-4'>
                  <Label>Nominated By</Label>
                  <Select disabled={formDisabled} value={form.nominatedBy || '__empty__'} onValueChange={(v) => updateField('nominatedBy', v)}>
                    <SelectTrigger className='w-full'>
                      <SelectValue placeholder='Select' />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='Shipper'>Shipper</SelectItem>
                      <SelectItem value='Consignee'>Consignee</SelectItem>
                      <SelectItem value='Forwarder'>Forwarder</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className='space-y-1 md:col-span-2'>
                  <Label>Marks</Label>
                  <Textarea value={form.marks} onChange={(e) => updateField('marks', e.target.value)} />
                </div>
                <div className='space-y-1 md:col-span-2'>
                  <Label>Description</Label>
                  <Textarea value={form.shipmentDescription} onChange={(e) => updateField('shipmentDescription', e.target.value)} />
                </div>

                <div className='space-y-1'>
                  <Label>Total NoOfPkgs.</Label>
                  <Input value={form.totalNoOfPkgs} onChange={(e) => updateField('totalNoOfPkgs', e.target.value)} />
                </div>
                <div className='space-y-1'>
                  <Label>Total Cr.Wt.</Label>
                  <Input value={form.totalCrWt} onChange={(e) => updateField('totalCrWt', e.target.value)} />
                </div>
                <div className='space-y-1'>
                  <Label>P.O. No.</Label>
                  <Input value={form.pono} onChange={(e) => updateField('pono', e.target.value)} />
                </div>
                <div className='space-y-1'>
                  <Label>Currency</Label>
                  <Select disabled={formDisabled} value={form.currency || '__empty__'} onValueChange={(v) => updateField('currency', v)}>
                    <SelectTrigger className='w-full'>
                      <SelectValue placeholder='Select' />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='USD'>USD</SelectItem>
                      <SelectItem value='TZS'>TZS</SelectItem>
                      <SelectItem value='EUR'>EUR</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className='space-y-1'>
                  <Label>FOB value</Label>
                  <Input value={form.fobValue} onChange={(e) => updateField('fobValue', e.target.value)} />
                </div>
                <div className='space-y-1'>
                  <Label>Pre Assessment Date</Label>
                  <Input type='date' value={form.preAssessmentDate} onChange={(e) => updateField('preAssessmentDate', e.target.value)} />
                </div>
                <div className='space-y-1'>
                  <Label>Final Assessment Date</Label>
                  <Input type='date' value={form.finalAssessmentDate} onChange={(e) => updateField('finalAssessmentDate', e.target.value)} />
                </div>
              </div>
              </fieldset>

              <div className='rounded-md border p-3'>
                <div className='mb-2 flex items-center justify-between'>
                  <button type='button' className='flex items-center gap-1 font-semibold text-amber-700' onClick={() => toggleShipmentSection('container')}>
                    {openShipmentSections.container ? <ChevronDown className='h-4 w-4' /> : <ChevronRight className='h-4 w-4' />} Container Shipment
                  </button>
                  <Button type='button' size='icon' className='h-7 w-7' disabled={formDisabled} onClick={addContainerRow}><Plus className='h-4 w-4' /></Button>
                </div>
                {openShipmentSections.container && (
                  <>
                  <fieldset disabled={formDisabled} className='min-w-0 border-0 p-0 m-0'>
                  <div className='overflow-x-auto rounded-md border'>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Container No.</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Seal No.</TableHead>
                        <TableHead>Weight</TableHead>
                        <TableHead>Gate Out</TableHead>
                        <TableHead>Returned</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>{form.containerShipment.map((row, i) => {
                      const typeTrimmed = row.type.trim()
                      const typeSelectValue = typeTrimmed ? typeTrimmed : '__none__'
                      const legacyType =
                        typeTrimmed &&
                        !(CONTAINER_TYPE_OPTIONS as readonly string[]).includes(typeTrimmed)
                      return (
                        <TableRow key={`c-${i}`}>
                          <TableCell><Input value={row.containerNo} onChange={(e) => updateContainerRow(i, 'containerNo', e.target.value)} /></TableCell>
                          <TableCell className='min-w-[140px]'>
                            <Select
                              disabled={formDisabled}
                              value={typeSelectValue}
                              onValueChange={(v) =>
                                updateContainerRow(i, 'type', v === '__none__' ? '' : v)
                              }
                            >
                              <SelectTrigger className='w-full'>
                                <SelectValue placeholder='Select type' />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value='__none__'>—</SelectItem>
                                {CONTAINER_TYPE_OPTIONS.map((opt) => (
                                  <SelectItem key={opt} value={opt}>
                                    {opt}
                                  </SelectItem>
                                ))}
                                {legacyType ? (
                                  <SelectItem value={typeTrimmed}>
                                    {typeTrimmed} (saved)
                                  </SelectItem>
                                ) : null}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell><Input value={row.sealNo} onChange={(e) => updateContainerRow(i, 'sealNo', e.target.value)} /></TableCell>
                          <TableCell><Input value={row.perContainerWeight} onChange={(e) => updateContainerRow(i, 'perContainerWeight', e.target.value)} /></TableCell>
                          <TableCell>
                            <Input
                              type='date'
                              value={row.gateOutDate}
                              onChange={(e) => updateContainerRow(i, 'gateOutDate', e.target.value)}
                              title='Set when release order is issued and container gates out'
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type='date'
                              value={row.returnedDate}
                              onChange={(e) => updateContainerRow(i, 'returnedDate', e.target.value)}
                              title='Stops demurrage accrual when container is returned'
                            />
                          </TableCell>
                        </TableRow>
                      )
                    })}</TableBody>
                  </Table>
                  </div>
                  </fieldset>

                  {form.containerShipment.some((row) => row.containerNo.trim() || row.type.trim()) ? (
                    <div className='mt-3 space-y-2'>
                      <p className='text-sm font-medium text-amber-800'>Estimated container charges</p>
                      <div className='grid gap-2 md:grid-cols-2'>
                        {form.containerShipment.map((row, i) => {
                          const costs = containerCostSummaries[i]
                          if (!row.containerNo.trim() && !row.type.trim()) return null
                          const label = row.containerNo.trim() || `Container ${i + 1}`
                          return (
                            <div key={`cost-${i}`} className='rounded-md border bg-muted/20 p-3 text-sm'>
                              <p className='font-medium'>
                                {label}
                                <span className='ml-2 text-xs font-normal text-muted-foreground'>
                                  ({costs.sizeClass})
                                </span>
                              </p>
                              <p className='mt-2'>
                                <span className='font-medium'>Demurrage:</span>{' '}
                                {formatUsd(costs.demurrage.totalUsd)}
                              </p>
                              <p className='text-xs text-muted-foreground'>{costs.demurrage.summary}</p>
                              <p className='mt-2'>
                                <span className='font-medium'>Storage:</span>{' '}
                                {formatUsd(costs.storage.totalUsd)}
                              </p>
                              <p className='text-xs text-muted-foreground'>{costs.storage.summary}</p>
                            </div>
                          )
                        })}
                      </div>
                      <p className='text-xs text-muted-foreground'>
                        Demurrage uses Discharge Date (14-day free time). Storage uses Carrying Date and stops on gate out (release order).
                      </p>
                    </div>
                  ) : null}
                  </>
                )}
              </div>

              <div className='rounded-md border p-3'>
                <div className='mb-2 flex items-center justify-between'>
                  <button type='button' className='flex items-center gap-1 font-semibold text-amber-700' onClick={() => toggleShipmentSection('vehicle')}>
                    {openShipmentSections.vehicle ? <ChevronDown className='h-4 w-4' /> : <ChevronRight className='h-4 w-4' />} Vehicle Shipment
                  </button>
                  <Button type='button' size='icon' className='h-7 w-7' disabled={formDisabled} onClick={addVehicleRow}><Plus className='h-4 w-4' /></Button>
                </div>
                {openShipmentSections.vehicle && (
                  <fieldset disabled={formDisabled} className='min-w-0 border-0 p-0 m-0'>
                  <Table><TableHeader><TableRow><TableHead>Chasis No.</TableHead><TableHead>Engine Capacity</TableHead><TableHead>CBM</TableHead><TableHead>Driver Cell No.</TableHead></TableRow></TableHeader>
                    <TableBody>{form.vehicleShipment.map((row, i) => {
                      const ccTrimmed = row.engineCapacity.trim()
                      const ccSelectValue = ccTrimmed ? ccTrimmed : '__none__'
                      const legacyCc =
                        ccTrimmed &&
                        !(ENGINE_CAPACITY_CC_OPTIONS as readonly string[]).includes(ccTrimmed)
                      return (
                        <TableRow key={`v-${i}`}>
                          <TableCell><Input value={row.chasisNo} onChange={(e) => updateVehicleRow(i, 'chasisNo', e.target.value)} /></TableCell>
                          <TableCell className='min-w-[140px]'>
                            <Select
                              disabled={formDisabled}
                              value={ccSelectValue}
                              onValueChange={(v) =>
                                updateVehicleRow(i, 'engineCapacity', v === '__none__' ? '' : v)
                              }
                            >
                              <SelectTrigger className='w-full'>
                                <SelectValue placeholder='Select CC' />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value='__none__'>—</SelectItem>
                                {ENGINE_CAPACITY_CC_OPTIONS.map((opt) => (
                                  <SelectItem key={opt} value={opt}>
                                    {opt}
                                  </SelectItem>
                                ))}
                                {legacyCc ? (
                                  <SelectItem value={ccTrimmed}>
                                    {ccTrimmed} (saved)
                                  </SelectItem>
                                ) : null}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell><Input value={row.cbm} onChange={(e) => updateVehicleRow(i, 'cbm', e.target.value)} /></TableCell>
                          <TableCell><Input value={row.driverCellNo} onChange={(e) => updateVehicleRow(i, 'driverCellNo', e.target.value)} /></TableCell>
                        </TableRow>
                      )
                    })}</TableBody>
                  </Table>
                  </fieldset>
                )}
              </div>

              <div className='rounded-md border p-3'>
                <div className='mb-2 flex items-center justify-between'>
                  <button type='button' className='flex items-center gap-1 font-semibold text-amber-700' onClick={() => toggleShipmentSection('looseCargo')}>
                    {openShipmentSections.looseCargo ? <ChevronDown className='h-4 w-4' /> : <ChevronRight className='h-4 w-4' />} Loose Cargo Shipment
                  </button>
                  <Button type='button' size='icon' className='h-7 w-7' disabled={formDisabled} onClick={addLooseCargoRow}><Plus className='h-4 w-4' /></Button>
                </div>
                {openShipmentSections.looseCargo && (
                  <fieldset disabled={formDisabled} className='min-w-0 border-0 p-0 m-0'>
                  <Table><TableHeader><TableRow><TableHead>Truck NO.</TableHead><TableHead>Trailer NO.</TableHead><TableHead>Transporter</TableHead><TableHead>LicenceNo.</TableHead></TableRow></TableHeader>
                    <TableBody>{form.looseCargoShipment.map((row, i) => <TableRow key={`l-${i}`}><TableCell><Input value={row.truckNo} onChange={(e) => updateLooseCargoRow(i, 'truckNo', e.target.value)} /></TableCell><TableCell><Input value={row.trailerNo} onChange={(e) => updateLooseCargoRow(i, 'trailerNo', e.target.value)} /></TableCell><TableCell><Input value={row.transporter} onChange={(e) => updateLooseCargoRow(i, 'transporter', e.target.value)} /></TableCell><TableCell><Input value={row.licenceNo} onChange={(e) => updateLooseCargoRow(i, 'licenceNo', e.target.value)} /></TableCell></TableRow>)}</TableBody>
                  </Table>
                  </fieldset>
                )}
              </div>
            </TabsContent>

            <TabsContent value='documents' className='space-y-3 rounded-md border p-4'>
              <div className='rounded-md border'>
                <div className='flex justify-end border-b bg-muted/40 px-3 py-2'>
                  <Button
                    type='button'
                    variant='link'
                    className='h-auto p-0 text-xs'
                    disabled={formDisabled}
                    onClick={() => setIsUploadModalOpen(true)}
                  >
                    Upload Document
                  </Button>
                </div>

                <div className='flex items-center gap-2 border-b bg-muted/40 px-3 py-2 text-sm'>
                  <span className='font-medium'>Search:</span>
                  <Input
                    className='h-7 max-w-xs'
                    value={documentsSearch}
                    onChange={(e) => setDocumentsSearch(e.target.value)}
                  />
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Document Name</TableHead>
                      <TableHead>Attached File</TableHead>
                      <TableHead>File Size</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {documentsLoading ? (
                      <TableRow>
                        <TableCell colSpan={5} className='text-center text-muted-foreground'>
                          Loading documents...
                        </TableCell>
                      </TableRow>
                    ) : null}
                    {uploadedDocuments
                      .filter((row) => {
                        const q = documentsSearch.trim().toLowerCase()
                        if (!q) return true
                        return row.name.toLowerCase().includes(q) || row.fileName.toLowerCase().includes(q)
                      })
                      .map((row) => (
                        <TableRow key={row.id}>
                          <TableCell>{row.name}</TableCell>
                          <TableCell>{row.fileName}</TableCell>
                          <TableCell>{row.fileSize}</TableCell>
                          <TableCell>{row.date}</TableCell>
                          <TableCell>
                            <div className='flex items-center gap-1'>
                              <Button variant='ghost' size='sm' onClick={() => handlePreviewDocument(row)}>
                                <Eye className='mr-1 h-4 w-4' />
                                Preview
                              </Button>
                              <Button variant='ghost' size='sm' onClick={() => handleDownloadDocument(row)}>
                                <Download className='mr-1 h-4 w-4' />
                                Download
                              </Button>
                              <Button
                                type='button'
                                variant='ghost'
                                size='sm'
                                disabled={formDisabled}
                                onClick={() => handleDeleteDocument(row)}
                              >
                                Delete
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    {!documentsLoading && uploadedDocuments.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className='text-center text-muted-foreground'>
                          No data available in table
                        </TableCell>
                      </TableRow>
                    ) : null}
                  </TableBody>
                </Table>
              </div>

              <Dialog
                open={isUploadModalOpen}
                onOpenChange={(nextOpen) => {
                  setIsUploadModalOpen(nextOpen)
                  if (!nextOpen) {
                    resetUploadModalForm()
                  }
                }}
              >
                <DialogContent className='max-w-[90vw]! w-[90vw]! sm:max-w-[1000px]'>
                  <DialogHeader>
                    <DialogTitle>Upload Details</DialogTitle>
                  </DialogHeader>

                  <div className='space-y-4'>
                    <div className='space-y-3 rounded-md border p-3'>
                      <div className='grid grid-cols-1 gap-3 md:grid-cols-2'>
                        <div className='space-y-1'>
                          <Label>Document Name</Label>
                          <Select
                            disabled={formDisabled}
                            value={documentName || '__empty__'}
                            onValueChange={(v) =>
                              setDocumentName(v === '__empty__' ? '' : v)
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder='SELECT' />
                            </SelectTrigger>
                            <SelectContent className='max-h-[min(22rem,var(--radix-select-content-available-height,22rem))]'>
                              <SelectItem value='__empty__'>SELECT</SelectItem>
                              {documentUploadGroups.map((group) => (
                                <SelectGroup key={group.stage}>
                                  <SelectLabel>{group.label}</SelectLabel>
                                  {group.names.map((option) => (
                                    <SelectItem key={`${group.stage}:${option}`} value={option}>
                                      {option}
                                    </SelectItem>
                                  ))}
                                </SelectGroup>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className='space-y-1'>
                          <Label>Document Name (If Not in List)</Label>
                          <Input
                            value={documentNameOther}
                            onChange={(e) => setDocumentNameOther(e.target.value)}
                          />
                        </div>
                      </div>

                      {isReleaseOrderUpload ? (
                        <div className='grid grid-cols-1 gap-3 rounded-md border border-amber-200 bg-amber-50/80 p-3 md:grid-cols-2'>
                          <div className='space-y-1 md:col-span-2'>
                            <p className='text-sm font-medium text-amber-900'>Release order — container gate out</p>
                            <p className='text-xs text-amber-800'>
                              Storage charges stop on the gate out date once the container is cleared.
                            </p>
                          </div>
                          <div className='space-y-1'>
                            <Label>Container</Label>
                            <Select
                              disabled={formDisabled}
                              value={releaseOrderContainerNo || '__empty__'}
                              onValueChange={(v) =>
                                setReleaseOrderContainerNo(v === '__empty__' ? '' : v)
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder='Select container' />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value='__empty__'>Select container</SelectItem>
                                {form.containerShipment
                                  .filter((row) => row.containerNo.trim())
                                  .map((row) => (
                                    <SelectItem key={row.containerNo} value={row.containerNo}>
                                      {row.containerNo}
                                      {row.type ? ` (${row.type})` : ''}
                                    </SelectItem>
                                  ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className='space-y-1'>
                            <Label>Gate out date</Label>
                            <Input
                              type='date'
                              value={releaseOrderGateOutDate}
                              onChange={(e) => setReleaseOrderGateOutDate(e.target.value)}
                            />
                          </div>
                        </div>
                      ) : null}

                      <div className='space-y-1'>
                        <Input
                          type='file'
                          onChange={handleDocumentFileSelect}
                        />
                        <p className='text-xs text-muted-foreground'>Maximum file size: 2 MB</p>
                      </div>
                    </div>

                    <div className='flex justify-center'>
                      <Button variant='secondary' onClick={handleAddPendingUpload}>
                        Add
                      </Button>
                    </div>

                    <div className='rounded-md border'>
                      <div className='flex items-center gap-2 border-b bg-muted/40 px-3 py-2 text-sm'>
                        <span className='font-medium'>Search:</span>
                        <Input
                          className='h-7 max-w-xs'
                          value={documentsSearch}
                          onChange={(e) => setDocumentsSearch(e.target.value)}
                        />
                      </div>

                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Document Name</TableHead>
                            <TableHead>Attached File</TableHead>
                            <TableHead>File Size</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Delete File</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {pendingUploads.length === 0 ? (
                            <TableRow>
                              <TableCell
                                colSpan={5}
                                className='text-center text-muted-foreground'
                              >
                                No data available in table
                              </TableCell>
                            </TableRow>
                          ) : (
                            pendingUploads
                              .filter((row) => {
                                const q = documentsSearch.trim().toLowerCase()
                                if (!q) return true
                                return (
                                  row.name.toLowerCase().includes(q) ||
                                  row.fileName.toLowerCase().includes(q)
                                )
                              })
                              .map((row) => (
                                <TableRow key={row.id}>
                                  <TableCell>{row.name}</TableCell>
                                  <TableCell>{row.fileName}</TableCell>
                                  <TableCell>{row.fileSize}</TableCell>
                                  <TableCell>{row.date}</TableCell>
                                  <TableCell>
                                    <Button
                                      variant='ghost'
                                      size='sm'
                                      onClick={() =>
                                        setPendingUploads((prev) =>
                                          prev.filter((item) => item.id !== row.id)
                                        )
                                      }
                                    >
                                      Delete
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              ))
                          )}
                        </TableBody>
                      </Table>
                    </div>

                    <div className='flex justify-center'>
                      <Button
                        onClick={() => void handleUploadDocuments()}
                        disabled={documentsUploading || pendingUploads.length === 0}
                      >
                        {documentsUploading ? 'Uploading...' : 'Upload'}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              <Dialog
                open={isDocumentPreviewOpen}
                onOpenChange={(open) => {
                  if (!open) closeDocumentPreview()
                }}
              >
                <DialogContent className='max-w-[95vw]! w-[95vw]! max-h-[90vh] overflow-y-auto sm:max-w-[1200px]!'>
                  <DialogHeader>
                    <DialogTitle>{documentPreviewName || 'Document Preview'}</DialogTitle>
                  </DialogHeader>

                  {detectPreviewKind(documentPreviewMimeType, documentPreviewName) === 'pdf' ? (
                    <div className='h-[75vh] w-full overflow-hidden rounded-md border'>
                      <iframe
                        title='Document preview'
                        src={documentPreviewUrl}
                        className='h-full w-full'
                      />
                    </div>
                  ) : null}

                  {detectPreviewKind(documentPreviewMimeType, documentPreviewName) === 'image' ? (
                    <div className='max-h-[75vh] w-full overflow-auto rounded-md border bg-muted/20 p-3'>
                      <img
                        src={documentPreviewUrl}
                        alt={documentPreviewName || 'Document preview'}
                        className='mx-auto h-auto max-h-[70vh] max-w-full rounded-md object-contain'
                      />
                    </div>
                  ) : null}

                  {detectPreviewKind(documentPreviewMimeType, documentPreviewName) === 'other' ? (
                    <div className='rounded-md border bg-muted/20 p-4 text-sm text-muted-foreground'>
                      This file type cannot be previewed inline. Use download to view it.
                    </div>
                  ) : null}

                  <DialogFooter>
                    <Button
                      variant='outline'
                      onClick={() =>
                        handleDownloadDocument({
                          fileName: documentPreviewName,
                          fileUrl: documentPreviewUrl,
                        })
                      }
                    >
                      <Download className='mr-1 h-4 w-4' />
                      Download
                    </Button>
                    <Button variant='secondary' onClick={closeDocumentPreview}>
                      Close
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </TabsContent>
            <TabsContent value='upload' className='space-y-3 rounded-md border p-4'>
              <fieldset disabled={formDisabled} className='min-w-0 border-0 p-0 m-0'>
              <div className='rounded-md border'>
                <div className='flex items-center justify-between border-b bg-muted/40 px-3 py-2 text-xs'>
                  <Button
                    variant='link'
                    className='h-auto p-0 text-xs'
                    onClick={() => csvInputRef.current?.click()}
                  >
                    Upload Commodity CSV
                  </Button>
                  <Button
                    variant='link'
                    className='h-auto p-0 text-xs'
                    onClick={() => excelInputRef.current?.click()}
                  >
                    Upload Commodity Excel
                  </Button>
                </div>
                <input
                  ref={csvInputRef}
                  type='file'
                  accept='.csv,text/csv'
                  className='hidden'
                  onChange={handleCsvFileChange}
                />
                <input
                  ref={excelInputRef}
                  type='file'
                  accept='.xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel'
                  className='hidden'
                  onChange={handleExcelFileChange}
                />

                {uploadedCommodityFiles.length > 0 ? (
                  <div className='border-b px-3 py-2 text-xs text-muted-foreground'>
                    Uploaded files: {uploadedCommodityFiles.join(', ')}
                  </div>
                ) : null}

                <div className='grid grid-cols-2 border-b bg-muted/20 px-3 py-2 text-center text-xs font-medium'>
                  <div>Download</div>
                  <div>Operations</div>
                </div>

                <div className='flex items-center gap-2 border-b bg-muted/40 px-3 py-2 text-sm'>
                  <span className='font-medium'>Search:</span>
                  <Input
                    className='h-7 max-w-xs'
                    value={commoditySearch}
                    onChange={(e) => setCommoditySearch(e.target.value)}
                  />
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item No.</TableHead>
                      <TableHead>CommodityCode</TableHead>
                      <TableHead>Desc.</TableHead>
                      <TableHead>Mode/Specification</TableHead>
                      <TableHead>Component</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Unit Price</TableHead>
                      <TableHead>Item Inv.Price.</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {commodityRows
                      .filter((row) => {
                        const q = commoditySearch.trim().toLowerCase()
                        if (!q) return true
                        return (
                          row.itemNo.toLowerCase().includes(q) ||
                          row.commodityCode.toLowerCase().includes(q) ||
                          row.desc.toLowerCase().includes(q)
                        )
                      })
                      .map((row, idx) => (
                        <TableRow key={`commodity-${idx}`}>
                          <TableCell>{row.itemNo}</TableCell>
                          <TableCell>{row.commodityCode}</TableCell>
                          <TableCell>{row.desc}</TableCell>
                          <TableCell>{row.modeSpecification}</TableCell>
                          <TableCell>{row.component}</TableCell>
                          <TableCell>{row.quantity}</TableCell>
                          <TableCell>{row.unitPrice}</TableCell>
                          <TableCell>{row.itemInvPrice}</TableCell>
                        </TableRow>
                      ))}
                    {commodityRows.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className='text-center text-muted-foreground'>
                          No commodity data uploaded
                        </TableCell>
                      </TableRow>
                    ) : null}
                  </TableBody>
                </Table>
              </div>
              </fieldset>
            </TabsContent>
            <TabsContent value='letters' className='space-y-3 rounded-md border p-4'>
              <fieldset disabled={formDisabled} className='min-w-0 border-0 p-0 m-0'>
              <div className='rounded-md border'>
                <div className='border-b bg-orange-100 px-3 py-2 text-center text-sm font-medium'>
                  {authorizationLetters.length > 0
                    ? authorizationLetters.join(', ')
                    : 'Authorization Letter'}
                </div>
                <div className='flex flex-col gap-2 px-3 py-3 md:flex-row md:items-center'>
                  <Input
                    type='file'
                    accept='.pdf,.doc,.docx,.jpg,.jpeg,.png'
                    onChange={(e) =>
                      setSelectedAuthorizationLetter(e.target.files?.[0] || null)
                    }
                  />
                  <Button
                    type='button'
                    onClick={() => {
                      if (!selectedAuthorizationLetter) {
                        toast.error('Choose an authorization letter first')
                        return
                      }
                      setAuthorizationLetters((prev) => [
                        ...prev,
                        selectedAuthorizationLetter.name,
                      ])
                      setSelectedAuthorizationLetter(null)
                      toast.success('Authorization letter added')
                    }}
                  >
                    Upload Letter
                  </Button>
                </div>
              </div>
              </fieldset>
            </TabsContent>
            <TabsContent value='notes' className='space-y-3 rounded-md border p-4'>
              <div className='rounded-md border'>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Edit</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {notes.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className='text-muted-foreground'>
                          No data available in table
                        </TableCell>
                      </TableRow>
                    ) : (
                      notes.map((note) => (
                        <TableRow key={note.id}>
                          <TableCell>{note.user}</TableCell>
                          <TableCell>{note.subject}</TableCell>
                          <TableCell>{note.date}</TableCell>
                          <TableCell>
                            <Button
                              variant='link'
                              className='h-auto p-0 text-xs'
                              onClick={() => {
                                setNoteSubject(note.subject)
                                setNoteBody(note.body)
                                setIsNotesModalOpen(true)
                              }}
                            >
                              View
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              <Button
                type='button'
                variant='secondary'
                disabled={formDisabled}
                onClick={() => {
                  resetNoteForm()
                  setIsNotesModalOpen(true)
                }}
              >
                New Notes
              </Button>

              <Dialog
                open={isNotesModalOpen}
                onOpenChange={(nextOpen) => {
                  setIsNotesModalOpen(nextOpen)
                  if (!nextOpen) {
                    resetNoteForm()
                  }
                }}
              >
                <DialogContent className='max-w-[760px]'>
                  <DialogHeader>
                    <DialogTitle>Notes</DialogTitle>
                    <DialogDescription />
                  </DialogHeader>

                  <div className='space-y-3'>
                    <div className='space-y-1 rounded-sm bg-orange-100 px-2 py-1'>
                      <Label>Subject:</Label>
                      <Select
                        value={noteSubject || '__empty__'}
                        disabled={formDisabled}
                        onValueChange={(v) =>
                          setNoteSubject(v === '__empty__' ? '' : v)
                        }
                      >
                        <SelectTrigger className='bg-white'>
                          <SelectValue placeholder='Select subject' />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value='__empty__'>Select</SelectItem>
                          {noteSubjectOptions.map((subject) => (
                            <SelectItem key={subject} value={subject}>
                              {subject}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className='space-y-1'>
                      <Label>Notes:</Label>
                      <Textarea
                        className='min-h-[120px]'
                        value={noteBody}
                        readOnly={isViewMode}
                        onChange={(e) => setNoteBody(e.target.value)}
                      />
                    </div>
                  </div>

                  <DialogFooter>
                    <Button
                      type='button'
                      variant='outline'
                      onClick={() => {
                        setIsNotesModalOpen(false)
                        resetNoteForm()
                      }}
                    >
                      Close
                    </Button>
                    {!isViewMode ? (
                      <Button type='button' onClick={handleAddNote}>
                        Add
                      </Button>
                    ) : null}
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </TabsContent>
          </Tabs>

          <div className='flex items-center justify-end gap-2'>
            <Button
              variant='outline'
              onClick={goToJobs}
              disabled={isSaving}
            >
              {pageMode === 'create' ? 'Cancel' : 'Close'}
            </Button>
            {!isViewMode && isDirty ? (
              <Button onClick={handleSave} disabled={isSaving || loadingJob}>
                {isSaving ? 'Saving...' : pageMode === 'update' ? 'Save' : 'Save Job'}
              </Button>
            ) : null}
          </div>
          </>
          )}
        </CardContent>
      </Card>
  )

  if (embedded) {
    return jobDetailsCard
  }

  return (
    <CustomsPage
      title={pageMode === 'view' ? 'View Job' : pageMode === 'update' ? 'Update Job' : 'Create Job'}
      description={
        pageMode === 'view'
          ? 'Review customs job details.'
          : pageMode === 'update'
            ? 'Update customs job details.'
            : 'Enter new customs job details.'
      }
      headerActions={
        <Button variant='outline' onClick={goToJobs}>
          Back to Jobs
        </Button>
      }
    >
      {jobDetailsCard}
    </CustomsPage>
  )
}
