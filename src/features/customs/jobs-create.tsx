import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import { useLocation } from '@tanstack/react-router'
import AsyncSelect from 'react-select/async'
import { ChevronDown, ChevronRight, Download, Eye, Plus } from 'lucide-react'
import { toast } from 'sonner'
import * as XLSX from 'xlsx'
import { CustomsPage } from './customs-page'
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
  SelectItem,
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
import { customerApi, customsJobApi, customsShipperApi, customsVesselApi } from '@/lib/api'
import { customsVesselVoyageApi } from '@/lib/api'
import { useAuthStore } from '@/stores/auth-store'
import { getStoredVessels, saveStoredVessels, type Vessel } from './vessels-storage'
import { type Shipper } from './shippers-storage'
import {
  getStoredVesselVoyages,
  saveStoredVesselVoyages,
  type VesselVoyage,
} from './vessel-voyage-storage'

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
  originCountry: string
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
  containerShipment: Array<{ containerNo: string; type: string; sealNo: string; perContainerWeight: string }>
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
  originCountry: '',
  portOfLoading: '',
  portOfDischarge: 'DAR ES SALAAM',
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
  containerShipment: [{ containerNo: '', type: '', sealNo: '', perContainerWeight: '' }],
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

export function CustomsCreateJob() {
  const loggedInUser = useAuthStore((s) => s.auth.user)
  const locationHref = useLocation({ select: (l) => l.href })
  const locationPathname = useLocation({ select: (l) => l.pathname })
  const searchParams = useMemo(() => {
    const parsed = new URL(locationHref, typeof window !== 'undefined' ? window.location.origin : 'http://localhost')
    const direct = new URLSearchParams(parsed.search || '')
    const hash = parsed.hash || ''
    const queryIndex = hash.indexOf('?')
    if (queryIndex === -1) return direct
    const hashQuery = new URLSearchParams(hash.slice(queryIndex + 1))
    hashQuery.forEach((value, key) => {
      if (!direct.has(key)) direct.set(key, value)
    })
    return direct
  }, [locationHref])
  const pageMode = (searchParams.get('mode') || '').toLowerCase() === 'view'
    ? 'view'
    : (searchParams.get('mode') || '').toLowerCase() === 'update'
      ? 'update'
      : 'create'
  const editingJobId = useMemo(() => {
    const candidates = [
      searchParams.get('id'),
      searchParams.get('jobId'),
      searchParams.get('job_id'),
    ].filter(Boolean) as string[]
    for (const raw of candidates) {
      const n = Number(raw)
      if (Number.isFinite(n) && n > 0) return n
    }
    const pathParts = (locationPathname || '').split('/').filter(Boolean)
    const pathTail = pathParts.length > 0 ? pathParts[pathParts.length - 1] : ''
    const pathId = Number(pathTail)
    return Number.isFinite(pathId) && pathId > 0 ? pathId : null
  }, [searchParams, locationPathname])
  const isViewMode = pageMode === 'view'
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
  const [isSaving, setIsSaving] = useState(false)
  const [loadingJob, setLoadingJob] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerOption | null>(null)
  const [selectedFileManager, setSelectedFileManager] = useState<FileManagerOption | null>(null)
  const [fileManagerSeedOptions, setFileManagerSeedOptions] = useState<FileManagerOption[]>([])

  const updateField = <K extends keyof JobForm>(key: K, value: JobForm[K]) => setForm((p) => ({ ...p, [key]: value }))

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

  useEffect(() => {
    if (!currentJobId) return
    fetchJobDocuments(currentJobId)
  }, [currentJobId])

  useEffect(() => {
    if (!editingJobId || pageMode === 'create') return
    let cancelled = false
    setLoadingJob(true)
    setForm(initialForm)
    setSelectedCustomer(null)
    setSelectedFileManager(null)
    customsJobApi
      .getJob(editingJobId)
      .then((job) => {
        if (!job || cancelled) return
        const meta = (job.meta || {}) as Record<string, any>
        const jobDetails = (meta.job_details || {}) as Record<string, any>
        const lineVesselDetails = (meta.line_vessel_details || {}) as Record<string, any>
        const shipmentDetails = (meta.shipment_details || {}) as Record<string, any>
        const containerShipment = Array.isArray(meta.container_shipment) ? meta.container_shipment : []
        const vehicleShipment = Array.isArray(meta.vehicle_shipment) ? meta.vehicle_shipment : []
        const looseCargoShipment = Array.isArray(meta.loose_cargo_shipment) ? meta.loose_cargo_shipment : []
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
          originCountry: String(shipmentDetails.origin_country || ''),
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
        setCommodityRows(Array.isArray((meta.upload_csv || {}).rows) ? (meta.upload_csv || {}).rows : [])
        setUploadedCommodityFiles(
          Array.isArray((meta.upload_csv || {}).files) ? (meta.upload_csv || {}).files : []
        )
        setAuthorizationLetters(Array.isArray(meta.letters) ? meta.letters : [])
        setNotes(Array.isArray(meta.notes) ? meta.notes : [])
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

  const addContainerRow = () => setForm((p) => ({ ...p, containerShipment: [...p.containerShipment, { containerNo: '', type: '', sealNo: '', perContainerWeight: '' }] }))
  const addVehicleRow = () => setForm((p) => ({ ...p, vehicleShipment: [...p.vehicleShipment, { chasisNo: '', engineCapacity: '', cbm: '', berthingDate: '', customReleaseDate: '', driverCellNo: '', dateOfDeparture: '', dateOfArrivalAtBorder: '', dateOfDepartAtBorder: '', dateOfDelivery: '' }] }))
  const addLooseCargoRow = () => setForm((p) => ({ ...p, looseCargoShipment: [...p.looseCargoShipment, { truckNo: '', trailerNo: '', transporter: '', licenceNo: 'NOT AVAILABLE', driverName: '', truckRegCard: '', trailerRegCard: '' }] }))

  const updateContainerRow = (index: number, field: 'containerNo' | 'type' | 'sealNo' | 'perContainerWeight', value: string) =>
    setForm((p) => ({ ...p, containerShipment: p.containerShipment.map((r, i) => (i === index ? { ...r, [field]: value } : r)) }))
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

  const documentNameOptions = [
    'TBS PERMIT',
    'INVOICE OF CARGO',
    'MASTER BILL OF LADING',
    'PACKING LIST OF CARGO',
    'C36 FORM',
    'CHEMICAL PERMIT',
    'AUTHORIZATION LETTER',
    'COA',
    'COO',
    'PROFORMA INVOICE',
    'ASSESSMENT NOTICE',
    'TRA PAYMENT',
    'PAYMENT NOTE',
    'WHARFAGE NOTICE',
    'WHARFAGE INVOICE',
    'WHARFAGE TISS',
    'ICD INVOICE',
    'ICD RECEIPT',
    'CORRIDOR LEVY INVOICE',
  ]

  const resetUploadModalForm = () => {
    setDocumentName('')
    setDocumentNameOther('')
    setSelectedFile(null)
    setPendingUploads([])
    setDocumentsSearch('')
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
  }

  const handleUploadDocuments = () => {
    if (pendingUploads.length === 0) {
      toast.error('Add at least one document before uploading')
      return
    }

    setUploadedDocuments((prev) => [...prev, ...pendingUploads])
    toast.success(`${pendingUploads.length} document(s) uploaded`)
    setIsUploadModalOpen(false)
    resetUploadModalForm()
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

  const fetchJobDocuments = async (jobId: number) => {
    setDocumentsLoading(true)
    try {
      const response = await customsJobApi.getJobDocuments(jobId, { per_page: 200 })
      const rows = Array.isArray(response?.data) ? response.data : []
      setUploadedDocuments(
        rows.map((row: any) => ({
          id: Number(row.id) || Date.now(),
          name: row.name || '-',
          fileName: row.file_name || '-',
          fileSize: row.file_size_bytes ? `${Math.max(1, Math.round(Number(row.file_size_bytes) / 1024))} KB` : '-',
          date: row.created_at ? new Date(row.created_at).toLocaleDateString() : '-',
          filePath: row.file_path || undefined,
          fileUrl: row.file_url || undefined,
          mimeType: row.mime_type || undefined,
        }))
      )
    } catch {
      toast.error('Failed to load uploaded documents')
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
      loading_vessel: form.loadingVessel || null,
      loading_voyage: form.loadingVoyage || null,
      discharging_vessel: form.dischargingVessel || null,
      discharging_voyage: form.dischargingVoyage || null,
      vessel_local_agent: form.vesselLocalAgent || null,
      vessel_type: form.vesselType || null,
      vessel_berthed_at: form.vesselBerthedAt || null,
      icd_transfer: form.icdTransfer || null,
      icd_transfer_location: form.icdTransferLocation || null,
    }

    const shipmentDetails = {
      origin_country: form.originCountry || null,
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
      let uploadedServerDocs: Array<{
        id: number
        name: string
        fileName: string
        fileSize: string
        date: string
        filePath?: string
        fileUrl?: string
        mimeType?: string
      }> = []

      const docsToUpload = uploadedDocuments.filter((doc) => doc.file instanceof File)
      if (docsToUpload.length > 0) {
        const uploadResults = await Promise.all(
          docsToUpload.map(async (doc) => {
            const response = await customsJobApi.uploadJobDocument(serverJob.id, {
              document_name: doc.name,
              file: doc.file as File,
            })
            const uploaded = response?.data
            return {
              id: uploaded?.id || doc.id,
              name: uploaded?.name || doc.name,
              fileName: uploaded?.file_name || doc.fileName,
              fileSize: doc.fileSize,
              date: doc.date,
              filePath: uploaded?.file_path,
              fileUrl: uploaded?.file_url,
              mimeType: uploaded?.mime_type,
            }
          })
        )
        uploadedServerDocs = uploadResults
        setUploadedDocuments(uploadResults)
      } else {
        await fetchJobDocuments(serverJob.id)
      }

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
          documents: uploadedServerDocs,
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
      toast.success(pageMode === 'update' ? 'Job updated successfully' : 'Job created successfully')
      goToJobs()
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
      <Card>
        <CardHeader>
          <CardTitle>{loadingJob ? 'Loading Job Details...' : 'Job Details'}</CardTitle>
          <CardDescription>Use tabs to complete the shipment information.</CardDescription>
        </CardHeader>
        <CardContent className='space-y-4'>
          <fieldset disabled={isSaving || isViewMode || loadingJob} className='space-y-4'>
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
                isDisabled={isViewMode}
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
            <div className='space-y-1'><Label>Cargo Type</Label><Select value={form.cargoType} onValueChange={(v) => updateField('cargoType', v)}><SelectTrigger className='w-full'><SelectValue /></SelectTrigger><SelectContent>{cargoTypeItems.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select></div>
            <div className='space-y-1'><Label>Type of Cargo</Label><Select value={form.typeOfCargo} onValueChange={(v) => updateField('typeOfCargo', v)}><SelectTrigger className='w-full'><SelectValue /></SelectTrigger><SelectContent>{typeOfCargoItems.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select></div>
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
                isDisabled={isViewMode}
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
            <div className='space-y-1'><Label>Shipment Type</Label><Select value={form.shipmentType} onValueChange={(v) => updateField('shipmentType', v)}><SelectTrigger className='w-full'><SelectValue /></SelectTrigger><SelectContent>{shipmentTypeItems.map((v) => <SelectItem key={v} value={v}>{labelForShipmentType(v)}</SelectItem>)}</SelectContent></Select></div>
          </div>

          <Tabs defaultValue='shipper' className='w-full'>
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
              <div className='grid grid-cols-1 gap-3 md:grid-cols-2'>
                <div className='space-y-1 md:col-span-2'>
                  <Label>Master shipper (optional)</Label>
                  <Select
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
            </TabsContent>

            <TabsContent value='line-vessel' className='space-y-3 rounded-md border p-4'>
              <div className='grid grid-cols-1 gap-3 md:grid-cols-4'>
                <div className='space-y-1'>
                  <Label>Shipping Line</Label>
                  <Input
                    value={form.shippingLine}
                    onChange={(e) => updateField('shippingLine', e.target.value)}
                  />
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
                  <Label>Carrying Date</Label>
                  <Input
                    type='date'
                    value={form.carryingDate}
                    onChange={(e) => updateField('carryingDate', e.target.value)}
                  />
                </div>

                <div className='space-y-1 md:col-span-2'>
                  <Label>Loading Vessel</Label>
                  <Select value={form.loadingVessel || '__empty__'} onValueChange={handleLoadingVesselChange}>
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

                <div className='space-y-1 md:col-span-3'>
                  <Label>ICD Transfer Location</Label>
                  <Input
                    value={form.icdTransferLocation}
                    onChange={(e) => updateField('icdTransferLocation', e.target.value)}
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value='shipment' className='space-y-3 rounded-md border p-4'>
              <div className='grid grid-cols-1 gap-3 md:grid-cols-4'>
                <div className='space-y-1'>
                  <Label>Origin Country</Label>
                  <Input value={form.originCountry} onChange={(e) => updateField('originCountry', e.target.value)} />
                </div>
                <div className='space-y-1'>
                  <Label>Port Of Loading</Label>
                  <Input value={form.portOfLoading} onChange={(e) => updateField('portOfLoading', e.target.value)} />
                </div>
                <div className='space-y-1'>
                  <Label>Port Of Discharge</Label>
                  <Input value={form.portOfDischarge} onChange={(e) => updateField('portOfDischarge', e.target.value)} />
                </div>
                <div className='space-y-1'>
                  <Label>Nominated By</Label>
                  <Select value={form.nominatedBy || '__empty__'} onValueChange={(v) => updateField('nominatedBy', v)}>
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
                  <Select value={form.currency || '__empty__'} onValueChange={(v) => updateField('currency', v)}>
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

              <div className='rounded-md border p-3'>
                <div className='mb-2 flex items-center justify-between'>
                  <button type='button' className='flex items-center gap-1 font-semibold text-amber-700' onClick={() => toggleShipmentSection('container')}>
                    {openShipmentSections.container ? <ChevronDown className='h-4 w-4' /> : <ChevronRight className='h-4 w-4' />} Container Shipment
                  </button>
                  <Button size='icon' className='h-7 w-7' onClick={addContainerRow}><Plus className='h-4 w-4' /></Button>
                </div>
                {openShipmentSections.container && (
                  <Table><TableHeader><TableRow><TableHead>Container No.</TableHead><TableHead>Type</TableHead><TableHead>Seal No.</TableHead><TableHead>Per Container Weight</TableHead></TableRow></TableHeader>
                    <TableBody>{form.containerShipment.map((row, i) => <TableRow key={`c-${i}`}><TableCell><Input value={row.containerNo} onChange={(e) => updateContainerRow(i, 'containerNo', e.target.value)} /></TableCell><TableCell><Input value={row.type} onChange={(e) => updateContainerRow(i, 'type', e.target.value)} /></TableCell><TableCell><Input value={row.sealNo} onChange={(e) => updateContainerRow(i, 'sealNo', e.target.value)} /></TableCell><TableCell><Input value={row.perContainerWeight} onChange={(e) => updateContainerRow(i, 'perContainerWeight', e.target.value)} /></TableCell></TableRow>)}</TableBody>
                  </Table>
                )}
              </div>

              <div className='rounded-md border p-3'>
                <div className='mb-2 flex items-center justify-between'>
                  <button type='button' className='flex items-center gap-1 font-semibold text-amber-700' onClick={() => toggleShipmentSection('vehicle')}>
                    {openShipmentSections.vehicle ? <ChevronDown className='h-4 w-4' /> : <ChevronRight className='h-4 w-4' />} Vehicle Shipment
                  </button>
                  <Button size='icon' className='h-7 w-7' onClick={addVehicleRow}><Plus className='h-4 w-4' /></Button>
                </div>
                {openShipmentSections.vehicle && (
                  <Table><TableHeader><TableRow><TableHead>Chasis No.</TableHead><TableHead>Engine Capacity</TableHead><TableHead>CBM</TableHead><TableHead>Driver Cell No.</TableHead></TableRow></TableHeader>
                    <TableBody>{form.vehicleShipment.map((row, i) => <TableRow key={`v-${i}`}><TableCell><Input value={row.chasisNo} onChange={(e) => updateVehicleRow(i, 'chasisNo', e.target.value)} /></TableCell><TableCell><Input value={row.engineCapacity} onChange={(e) => updateVehicleRow(i, 'engineCapacity', e.target.value)} /></TableCell><TableCell><Input value={row.cbm} onChange={(e) => updateVehicleRow(i, 'cbm', e.target.value)} /></TableCell><TableCell><Input value={row.driverCellNo} onChange={(e) => updateVehicleRow(i, 'driverCellNo', e.target.value)} /></TableCell></TableRow>)}</TableBody>
                  </Table>
                )}
              </div>

              <div className='rounded-md border p-3'>
                <div className='mb-2 flex items-center justify-between'>
                  <button type='button' className='flex items-center gap-1 font-semibold text-amber-700' onClick={() => toggleShipmentSection('looseCargo')}>
                    {openShipmentSections.looseCargo ? <ChevronDown className='h-4 w-4' /> : <ChevronRight className='h-4 w-4' />} Loose Cargo Shipment
                  </button>
                  <Button size='icon' className='h-7 w-7' onClick={addLooseCargoRow}><Plus className='h-4 w-4' /></Button>
                </div>
                {openShipmentSections.looseCargo && (
                  <Table><TableHeader><TableRow><TableHead>Truck NO.</TableHead><TableHead>Trailer NO.</TableHead><TableHead>Transporter</TableHead><TableHead>LicenceNo.</TableHead></TableRow></TableHeader>
                    <TableBody>{form.looseCargoShipment.map((row, i) => <TableRow key={`l-${i}`}><TableCell><Input value={row.truckNo} onChange={(e) => updateLooseCargoRow(i, 'truckNo', e.target.value)} /></TableCell><TableCell><Input value={row.trailerNo} onChange={(e) => updateLooseCargoRow(i, 'trailerNo', e.target.value)} /></TableCell><TableCell><Input value={row.transporter} onChange={(e) => updateLooseCargoRow(i, 'transporter', e.target.value)} /></TableCell><TableCell><Input value={row.licenceNo} onChange={(e) => updateLooseCargoRow(i, 'licenceNo', e.target.value)} /></TableCell></TableRow>)}</TableBody>
                  </Table>
                )}
              </div>
            </TabsContent>

            <TabsContent value='documents' className='space-y-3 rounded-md border p-4'>
              <div className='rounded-md border'>
                <div className='flex justify-end border-b bg-muted/40 px-3 py-2'>
                  <Button
                    variant='link'
                    className='h-auto p-0 text-xs'
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
                              <Button variant='ghost' size='sm' onClick={() => handleDeleteDocument(row)}>
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
                            value={documentName || '__empty__'}
                            onValueChange={(v) =>
                              setDocumentName(v === '__empty__' ? '' : v)
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder='SELECT' />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value='__empty__'>SELECT</SelectItem>
                              {documentNameOptions.map((option) => (
                                <SelectItem key={option} value={option}>
                                  {option}
                                </SelectItem>
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

                      <div className='space-y-1'>
                        <Input
                          type='file'
                          onChange={(e) =>
                            setSelectedFile(e.target.files?.[0] || null)
                          }
                        />
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
                      <Button onClick={handleUploadDocuments}>Upload</Button>
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
            </TabsContent>
            <TabsContent value='letters' className='space-y-3 rounded-md border p-4'>
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
                variant='secondary'
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
                        onChange={(e) => setNoteBody(e.target.value)}
                      />
                    </div>
                  </div>

                  <DialogFooter>
                    <Button
                      variant='outline'
                      onClick={() => {
                        setIsNotesModalOpen(false)
                        resetNoteForm()
                      }}
                    >
                      Close
                    </Button>
                    <Button onClick={handleAddNote}>Add</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </TabsContent>
          </Tabs>
          </fieldset>

          <div className='flex items-center justify-end gap-2'>
            <Button
              variant='outline'
              onClick={goToJobs}
              disabled={isSaving}
            >
              Cancel
            </Button>
            {!isViewMode ? (
              <Button onClick={handleSave} disabled={isSaving || loadingJob}>
                {isSaving ? 'Saving...' : pageMode === 'update' ? 'Update Job' : 'Save Job'}
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </CustomsPage>
  )
}
