import { useEffect, useMemo, useState } from 'react'
import { ChevronDown, ChevronRight, Plus } from 'lucide-react'
import { toast } from 'sonner'
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
import { customsJobApi } from '@/lib/api'

type JobForm = {
  shipmentType: string
  mblNo: string
  hblNo: string
  invoiceNo: string
  customerName: string
  customerRefNo: string
  dateOfReceipt: string
  cargoType: string
  typeOfCargo: string
  referenceNo: string
  idfNo: string
  tansadNo: string
  idfTansadDate: string
  createdBy: string
  supplierName: string
  supplierAddress: string
  consigneeName: string
  consigneeAddress: string
  notifyPartyName: string
  notifyAddress: string
  status: string
  shippingLine: string
  eta: string
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
}

const initialForm: JobForm = {
  shipmentType: 'SEA',
  mblNo: '',
  hblNo: '',
  invoiceNo: '',
  customerName: '',
  customerRefNo: '',
  dateOfReceipt: '',
  cargoType: 'FCL',
  typeOfCargo: 'NORMAL',
  referenceNo: '',
  idfNo: '',
  tansadNo: '',
  idfTansadDate: '',
  createdBy: '',
  supplierName: '',
  supplierAddress: '',
  consigneeName: '',
  consigneeAddress: '',
  notifyPartyName: '',
  notifyAddress: '',
  status: 'OTHER',
  shippingLine: '',
  eta: '',
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
}

export function CustomsCreateJob() {
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
    }>
  >([])
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

  const updateField = <K extends keyof JobForm>(key: K, value: JobForm[K]) => setForm((p) => ({ ...p, [key]: value }))
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

    toast.success(`${pendingUploads.length} document(s) queued for upload`)
    setIsUploadModalOpen(false)
    resetUploadModalForm()
  }

  const handleSave = () => {
    if (!form.customerName.trim()) {
      toast.error('Customer name is required')
      return
    }
    const id = Date.now()
    const job: Job = {
      id,
      jobNo: `JOB-${id.toString().slice(-6)}`,
      customerName: form.customerName.trim(),
      shipmentType: form.shipmentType,
      mblNo: form.mblNo.trim(),
      hblNo: form.hblNo.trim(),
      invoiceNo: form.invoiceNo.trim(),
      status: form.status,
      stageProgress: createInitialJobStageProgress(),
      stageAssignments: createInitialJobStageAssignments(),
      dateOfReceipt: form.dateOfReceipt || '-',
      createdAt: new Date().toISOString(),
    }
    prependStoredJob(job)
    toast.success('Job created successfully')
    goToJobs()
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
      title='Create Job'
      description='Enter new customs job details.'
      headerActions={
        <Button variant='outline' onClick={goToJobs}>
          Back to Jobs
        </Button>
      }
    >
      <Card>
        <CardHeader>
          <CardTitle>Job Details</CardTitle>
          <CardDescription>Use tabs to complete the shipment information.</CardDescription>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='grid grid-cols-1 gap-3 md:grid-cols-4'>
            <div className='space-y-1'><Label>MBL No.</Label><Input value={form.mblNo} onChange={(e) => updateField('mblNo', e.target.value)} /></div>
            <div className='space-y-1'><Label>Customer Name</Label><Input value={form.customerName} onChange={(e) => updateField('customerName', e.target.value)} /></div>
            <div className='space-y-1'><Label>Date of Receipt</Label><Input type='date' value={form.dateOfReceipt} onChange={(e) => updateField('dateOfReceipt', e.target.value)} /></div>
            <div className='space-y-1'><Label>Shipment Type</Label><Select value={form.shipmentType} onValueChange={(v) => updateField('shipmentType', v)}><SelectTrigger className='w-full'><SelectValue /></SelectTrigger><SelectContent>{shipmentTypeItems.map((v) => <SelectItem key={v} value={v}>{labelForShipmentType(v)}</SelectItem>)}</SelectContent></Select></div>
            <div className='space-y-1'><Label>HBL/FBO No.</Label><Input value={form.hblNo} onChange={(e) => updateField('hblNo', e.target.value)} /></div>
            <div className='space-y-1'><Label>Customer Ref No.</Label><Input value={form.customerRefNo} onChange={(e) => updateField('customerRefNo', e.target.value)} /></div>
            <div className='space-y-1'><Label>Cargo Type</Label><Select value={form.cargoType} onValueChange={(v) => updateField('cargoType', v)}><SelectTrigger className='w-full'><SelectValue /></SelectTrigger><SelectContent>{cargoTypeItems.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select></div>
            <div className='space-y-1'><Label>Type of Cargo</Label><Select value={form.typeOfCargo} onValueChange={(v) => updateField('typeOfCargo', v)}><SelectTrigger className='w-full'><SelectValue /></SelectTrigger><SelectContent>{typeOfCargoItems.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select></div>
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
                <div className='space-y-1'><Label>Shipping Line</Label><Input value={form.shippingLine} onChange={(e) => updateField('shippingLine', e.target.value)} /></div>
                <div className='space-y-1'><Label>ETA</Label><Input type='date' value={form.eta} onChange={(e) => updateField('eta', e.target.value)} /></div>
                <div className='space-y-1'><Label>Arrival Date</Label><Input type='date' value={form.arrivalDate} onChange={(e) => updateField('arrivalDate', e.target.value)} /></div>
                <div className='space-y-1'><Label>Berthing Date</Label><Input type='date' value={form.berthingDate} onChange={(e) => updateField('berthingDate', e.target.value)} /></div>
              </div>
            </TabsContent>

            <TabsContent value='shipment' className='space-y-3 rounded-md border p-4'>
              <div className='grid grid-cols-1 gap-3 md:grid-cols-4'>
                <div className='space-y-1'><Label>Origin Country</Label><Input value={form.originCountry} onChange={(e) => updateField('originCountry', e.target.value)} /></div>
                <div className='space-y-1'><Label>Port Of Loading</Label><Input value={form.portOfLoading} onChange={(e) => updateField('portOfLoading', e.target.value)} /></div>
                <div className='space-y-1'><Label>Port Of Discharge</Label><Input value={form.portOfDischarge} onChange={(e) => updateField('portOfDischarge', e.target.value)} /></div>
                <div className='space-y-1'><Label>Nominated By</Label><Input value={form.nominatedBy} onChange={(e) => updateField('nominatedBy', e.target.value)} /></div>
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

                <div className='border-b px-3 py-6 text-center text-sm text-muted-foreground'>
                  No data available in table
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
                      <TableHead>Delete File</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody />
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
            </TabsContent>
            <TabsContent value='upload' className='space-y-3 rounded-md border p-4'>
              <div className='rounded-md border'>
                <div className='flex items-center justify-between border-b bg-muted/40 px-3 py-2 text-xs'>
                  <Button variant='link' className='h-auto p-0 text-xs'>
                    Upload Commodity CSV
                  </Button>
                  <Button variant='link' className='h-auto p-0 text-xs'>
                    Upload Commodity Excel
                  </Button>
                </div>

                <div className='grid grid-cols-2 border-b bg-muted/20 px-3 py-2 text-center text-xs font-medium'>
                  <div>Download</div>
                  <div>Operations</div>
                </div>

                <div className='flex items-center gap-2 border-b bg-muted/40 px-3 py-2 text-sm'>
                  <span className='font-medium'>Search:</span>
                  <Input className='h-7 max-w-xs' />
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
                  <TableBody />
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

          <div className='flex items-center justify-end gap-2'>
            <Button
              variant='outline'
              onClick={goToJobs}
            >
              Cancel
            </Button>
            <Button onClick={handleSave}>Save Job</Button>
          </div>
        </CardContent>
      </Card>
    </CustomsPage>
  )
}
