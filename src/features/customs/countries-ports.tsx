import { useCallback, useEffect, useMemo, useState } from 'react'
import { ChevronDown, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { CustomsPage } from './customs-page'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  customsCountryApi,
  customsPortApi,
  type CustomsCountry,
  type CustomsPort,
  type PaginationMeta,
} from '@/lib/api'

const emptyPagination: PaginationMeta = {
  current_page: 1,
  per_page: 20,
  total: 0,
  last_page: 1,
  from: null,
  to: null,
}

export function CustomsCountriesPorts() {
  const [countriesAll, setCountriesAll] = useState<CustomsCountry[]>([])

  const [countrySearchInput, setCountrySearchInput] = useState('')
  const [countrySearch, setCountrySearch] = useState('')
  const [countryPage, setCountryPage] = useState(1)
  const [countries, setCountries] = useState<CustomsCountry[]>([])
  const [countryPagination, setCountryPagination] = useState<PaginationMeta>(emptyPagination)
  const [countryLoading, setCountryLoading] = useState(false)

  const [countryModalOpen, setCountryModalOpen] = useState(false)
  const [countryModalMode, setCountryModalMode] = useState<'create' | 'edit'>('create')
  const [countryEditingId, setCountryEditingId] = useState<number | null>(null)
  const [countryFormName, setCountryFormName] = useState('')
  const [countrySaving, setCountrySaving] = useState(false)

  const [deleteCountryTarget, setDeleteCountryTarget] = useState<CustomsCountry | null>(null)
  const [deleteCountryLoading, setDeleteCountryLoading] = useState(false)

  const [portCountryFilter, setPortCountryFilter] = useState<string>('__all__')
  const [portSearchInput, setPortSearchInput] = useState('')
  const [portSearch, setPortSearch] = useState('')
  const [portPage, setPortPage] = useState(1)
  const [ports, setPorts] = useState<CustomsPort[]>([])
  const [portPagination, setPortPagination] = useState<PaginationMeta>(emptyPagination)
  const [portLoading, setPortLoading] = useState(false)

  const [portModalOpen, setPortModalOpen] = useState(false)
  const [portModalMode, setPortModalMode] = useState<'create' | 'edit'>('create')
  const [portEditingId, setPortEditingId] = useState<number | null>(null)
  const [portFormCountryId, setPortFormCountryId] = useState('')
  const [portFormName, setPortFormName] = useState('')
  const [portSaving, setPortSaving] = useState(false)

  const [deletePortTarget, setDeletePortTarget] = useState<CustomsPort | null>(null)
  const [deletePortLoading, setDeletePortLoading] = useState(false)

  useEffect(() => {
    const t = window.setTimeout(() => {
      setCountrySearch(countrySearchInput.trim())
      setCountryPage(1)
    }, 350)
    return () => window.clearTimeout(t)
  }, [countrySearchInput])

  useEffect(() => {
    const t = window.setTimeout(() => {
      setPortSearch(portSearchInput.trim())
      setPortPage(1)
    }, 350)
    return () => window.clearTimeout(t)
  }, [portSearchInput])

  const loadCountriesPage = useCallback(async () => {
    setCountryLoading(true)
    try {
      const res = await customsCountryApi.list({
        search: countrySearch || undefined,
        per_page: 20,
        page: countryPage,
      })
      setCountries(res.data)
      setCountryPagination({
        ...res.pagination,
        from: res.pagination.from ?? null,
        to: res.pagination.to ?? null,
      })
    } catch {
      setCountries([])
      setCountryPagination(emptyPagination)
    } finally {
      setCountryLoading(false)
    }
  }, [countrySearch, countryPage])

  useEffect(() => {
    void loadCountriesPage()
  }, [loadCountriesPage])

  const loadCountriesForSelect = useCallback(async () => {
    try {
      const res = await customsCountryApi.list({ per_page: 200, page: 1 })
      setCountriesAll(res.data)
    } catch {
      setCountriesAll([])
    }
  }, [])

  useEffect(() => {
    void loadCountriesForSelect()
  }, [loadCountriesForSelect])

  const loadPortsPage = useCallback(async () => {
    setPortLoading(true)
    try {
      const countryId =
        portCountryFilter !== '__all__' ? Number(portCountryFilter) : undefined
      const res = await customsPortApi.list({
        ...(countryId && Number.isFinite(countryId) && countryId > 0 ? { country_id: countryId } : {}),
        search: portSearch || undefined,
        per_page: 20,
        page: portPage,
      })
      setPorts(res.data)
      setPortPagination({
        ...res.pagination,
        from: res.pagination.from ?? null,
        to: res.pagination.to ?? null,
      })
    } catch {
      setPorts([])
      setPortPagination(emptyPagination)
    } finally {
      setPortLoading(false)
    }
  }, [portCountryFilter, portSearch, portPage])

  useEffect(() => {
    void loadPortsPage()
  }, [loadPortsPage])

  const openCountryCreate = () => {
    setCountryModalMode('create')
    setCountryEditingId(null)
    setCountryFormName('')
    setCountryModalOpen(true)
  }

  const openCountryEdit = (row: CustomsCountry) => {
    setCountryModalMode('edit')
    setCountryEditingId(row.id)
    setCountryFormName(row.name)
    setCountryModalOpen(true)
  }

  const saveCountry = async () => {
    const name = countryFormName.trim()
    if (!name) {
      toast.error('Country name is required')
      return
    }
    setCountrySaving(true)
    try {
      if (countryModalMode === 'create') {
        await customsCountryApi.create({ name })
        toast.success('Country added')
      } else if (countryEditingId != null) {
        await customsCountryApi.update(countryEditingId, { name })
        toast.success('Country updated')
      }
      setCountryModalOpen(false)
      void loadCountriesPage()
      void loadCountriesForSelect()
    } catch {
      //
    } finally {
      setCountrySaving(false)
    }
  }

  const confirmDeleteCountry = async () => {
    if (!deleteCountryTarget) return
    setDeleteCountryLoading(true)
    try {
      await customsCountryApi.delete(deleteCountryTarget.id)
      toast.success('Country deleted')
      setDeleteCountryTarget(null)
      void loadCountriesPage()
      void loadCountriesForSelect()
      void loadPortsPage()
    } catch {
      //
    } finally {
      setDeleteCountryLoading(false)
    }
  }

  const openPortCreate = () => {
    setPortModalMode('create')
    setPortEditingId(null)
    setPortFormCountryId(portCountryFilter !== '__all__' ? portCountryFilter : '')
    setPortFormName('')
    setPortModalOpen(true)
  }

  const openPortEdit = (row: CustomsPort) => {
    setPortModalMode('edit')
    setPortEditingId(row.id)
    setPortFormCountryId(String(row.countryId))
    setPortFormName(row.name)
    setPortModalOpen(true)
  }

  const savePort = async () => {
    const name = portFormName.trim()
    const cid = Number(portFormCountryId)
    if (!name) {
      toast.error('Port name is required')
      return
    }
    if (!Number.isFinite(cid) || cid <= 0) {
      toast.error('Select a country')
      return
    }
    setPortSaving(true)
    try {
      if (portModalMode === 'create') {
        await customsPortApi.create({ country_id: cid, name })
        toast.success('Port added')
      } else if (portEditingId != null) {
        await customsPortApi.update(portEditingId, { country_id: cid, name })
        toast.success('Port updated')
      }
      setPortModalOpen(false)
      void loadPortsPage()
      void loadCountriesPage()
      void loadCountriesForSelect()
    } catch {
      //
    } finally {
      setPortSaving(false)
    }
  }

  const confirmDeletePort = async () => {
    if (!deletePortTarget) return
    setDeletePortLoading(true)
    try {
      await customsPortApi.delete(deletePortTarget.id)
      toast.success('Port deleted')
      setDeletePortTarget(null)
      void loadPortsPage()
      void loadCountriesPage()
      void loadCountriesForSelect()
    } catch {
      //
    } finally {
      setDeletePortLoading(false)
    }
  }

  const sortedCountriesForSelect = useMemo(
    () => [...countriesAll].sort((a, b) => a.name.localeCompare(b.name)),
    [countriesAll]
  )

  const countryFrom = countryPagination.from ?? 0
  const countryTo = countryPagination.to ?? 0
  const portFrom = portPagination.from ?? 0
  const portTo = portPagination.to ?? 0

  return (
    <CustomsPage
      title='Countries & ports'
      description='Manage origin countries and their ports for shipment details on customs jobs.'
    >
      <Tabs defaultValue='countries' className='w-full'>
        <TabsList className='mb-4'>
          <TabsTrigger value='countries'>Countries</TabsTrigger>
          <TabsTrigger value='ports'>Ports</TabsTrigger>
        </TabsList>

        <TabsContent value='countries'>
          <Card>
            <CardHeader className='flex flex-row flex-wrap items-start justify-between gap-3'>
              <div>
                <CardTitle>Countries</CardTitle>
                <CardDescription>
                  Add regions such as China or Tanzania, then add ports under Ports.
                </CardDescription>
              </div>
              <Button type='button' onClick={openCountryCreate}>
                <Plus className='mr-2 h-4 w-4' />
                Add country
              </Button>
            </CardHeader>
            <CardContent>
              <div className='relative mb-4 max-w-md'>
                <Search className='absolute left-2 top-2.5 h-4 w-4 text-muted-foreground' />
                <Input
                  className='pl-8'
                  value={countrySearchInput}
                  onChange={(e) => setCountrySearchInput(e.target.value)}
                  placeholder='Search country name'
                />
              </div>
              <div className='rounded-md border'>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className='w-14'>S/N</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead className='w-28'>Ports</TableHead>
                      <TableHead className='w-[120px] text-right'>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {countryLoading ? (
                      <TableRow>
                        <TableCell colSpan={4} className='py-8 text-center text-muted-foreground'>
                          Loading…
                        </TableCell>
                      </TableRow>
                    ) : countries.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className='py-8 text-center text-muted-foreground'>
                          No countries yet.
                        </TableCell>
                      </TableRow>
                    ) : (
                      countries.map((row, index) => (
                        <TableRow key={row.id}>
                          <TableCell>
                            {(countryPagination.current_page - 1) * countryPagination.per_page +
                              index +
                              1}
                          </TableCell>
                          <TableCell className='font-medium'>{row.name}</TableCell>
                          <TableCell>{row.portsCount}</TableCell>
                          <TableCell className='text-right'>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button type='button' variant='outline' size='sm'>
                                  Options
                                  <ChevronDown className='ml-2 h-4 w-4' />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align='end' className='w-44'>
                                <DropdownMenuLabel>Action</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => openCountryEdit(row)}>
                                  <Pencil className='mr-2 h-4 w-4' />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className='text-destructive focus:text-destructive'
                                  onClick={() => setDeleteCountryTarget(row)}
                                >
                                  <Trash2 className='mr-2 h-4 w-4' />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
              {countryPagination.last_page > 1 && (
                <div className='mt-4 flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground'>
                  <span>
                    {countryPagination.total > 0
                      ? `Showing ${countryFrom || 1}–${countryTo || countries.length} of ${countryPagination.total}`
                      : 'No results'}
                  </span>
                  <div className='flex gap-2'>
                    <Button
                      type='button'
                      variant='outline'
                      size='sm'
                      disabled={countryPage <= 1 || countryLoading}
                      onClick={() => setCountryPage((p) => Math.max(1, p - 1))}
                    >
                      Previous
                    </Button>
                    <Button
                      type='button'
                      variant='outline'
                      size='sm'
                      disabled={countryPage >= countryPagination.last_page || countryLoading}
                      onClick={() => setCountryPage((p) => p + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value='ports'>
          <Card>
            <CardHeader className='flex flex-row flex-wrap items-start justify-between gap-3'>
              <div>
                <CardTitle>Ports</CardTitle>
                <CardDescription>
                  Each port belongs to one country (e.g. Shanghai → China, Dar es Salaam → Tanzania).
                </CardDescription>
              </div>
              <Button type='button' onClick={openPortCreate} disabled={sortedCountriesForSelect.length === 0}>
                <Plus className='mr-2 h-4 w-4' />
                Add port
              </Button>
            </CardHeader>
            <CardContent>
              <div className='mb-4 flex flex-wrap gap-3'>
                <div className='min-w-[200px] flex-1 space-y-1'>
                  <Label>Country filter</Label>
                  <Select
                    value={portCountryFilter}
                    onValueChange={(v) => {
                      setPortCountryFilter(v)
                      setPortPage(1)
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder='All countries' />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='__all__'>All countries</SelectItem>
                      {sortedCountriesForSelect.map((c) => (
                        <SelectItem key={c.id} value={String(c.id)}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className='relative min-w-[200px] flex-1'>
                  <Label className='mb-1 block'>Search port</Label>
                  <Search className='absolute left-2 top-8 h-4 w-4 text-muted-foreground' />
                  <Input
                    className='pl-8'
                    value={portSearchInput}
                    onChange={(e) => setPortSearchInput(e.target.value)}
                    placeholder='Port name'
                  />
                </div>
              </div>
              <div className='rounded-md border'>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className='w-14'>S/N</TableHead>
                      <TableHead>Country</TableHead>
                      <TableHead>Port</TableHead>
                      <TableHead className='w-[120px] text-right'>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {portLoading ? (
                      <TableRow>
                        <TableCell colSpan={4} className='py-8 text-center text-muted-foreground'>
                          Loading…
                        </TableCell>
                      </TableRow>
                    ) : ports.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className='py-8 text-center text-muted-foreground'>
                          No ports yet. Add countries first, then create ports.
                        </TableCell>
                      </TableRow>
                    ) : (
                      ports.map((row, index) => (
                        <TableRow key={row.id}>
                          <TableCell>
                            {(portPagination.current_page - 1) * portPagination.per_page + index + 1}
                          </TableCell>
                          <TableCell>{row.countryName || '—'}</TableCell>
                          <TableCell className='font-medium'>{row.name}</TableCell>
                          <TableCell className='text-right'>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button type='button' variant='outline' size='sm'>
                                  Options
                                  <ChevronDown className='ml-2 h-4 w-4' />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align='end' className='w-44'>
                                <DropdownMenuLabel>Action</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => openPortEdit(row)}>
                                  <Pencil className='mr-2 h-4 w-4' />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className='text-destructive focus:text-destructive'
                                  onClick={() => setDeletePortTarget(row)}
                                >
                                  <Trash2 className='mr-2 h-4 w-4' />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
              {portPagination.last_page > 1 && (
                <div className='mt-4 flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground'>
                  <span>
                    {portPagination.total > 0
                      ? `Showing ${portFrom || 1}–${portTo || ports.length} of ${portPagination.total}`
                      : 'No results'}
                  </span>
                  <div className='flex gap-2'>
                    <Button
                      type='button'
                      variant='outline'
                      size='sm'
                      disabled={portPage <= 1 || portLoading}
                      onClick={() => setPortPage((p) => Math.max(1, p - 1))}
                    >
                      Previous
                    </Button>
                    <Button
                      type='button'
                      variant='outline'
                      size='sm'
                      disabled={portPage >= portPagination.last_page || portLoading}
                      onClick={() => setPortPage((p) => p + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={countryModalOpen} onOpenChange={setCountryModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{countryModalMode === 'create' ? 'Add country' : 'Edit country'}</DialogTitle>
          </DialogHeader>
          <div className='space-y-2 py-2'>
            <Label>Name</Label>
            <Input value={countryFormName} onChange={(e) => setCountryFormName(e.target.value)} />
          </div>
          <DialogFooter>
            <Button type='button' variant='outline' onClick={() => setCountryModalOpen(false)}>
              Cancel
            </Button>
            <Button type='button' disabled={countrySaving} onClick={() => void saveCountry()}>
              {countrySaving ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={portModalOpen} onOpenChange={setPortModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{portModalMode === 'create' ? 'Add port' : 'Edit port'}</DialogTitle>
          </DialogHeader>
          <div className='grid gap-3 py-2'>
            <div className='space-y-1'>
              <Label>Country</Label>
              <Select value={portFormCountryId || '__none__'} onValueChange={(v) => setPortFormCountryId(v === '__none__' ? '' : v)}>
                <SelectTrigger>
                  <SelectValue placeholder='Select country' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='__none__'>Select…</SelectItem>
                  {sortedCountriesForSelect.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className='space-y-1'>
              <Label>Port name</Label>
              <Input value={portFormName} onChange={(e) => setPortFormName(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button type='button' variant='outline' onClick={() => setPortModalOpen(false)}>
              Cancel
            </Button>
            <Button type='button' disabled={portSaving} onClick={() => void savePort()}>
              {portSaving ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(deleteCountryTarget)} onOpenChange={(o) => !o && setDeleteCountryTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete country?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteCountryTarget
                ? `Delete “${deleteCountryTarget.name}”? You must delete all ports in this country first.`
                : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteCountryLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className='bg-red-600 hover:bg-red-700'
              disabled={deleteCountryLoading}
              onClick={(e) => {
                e.preventDefault()
                void confirmDeleteCountry()
              }}
            >
              {deleteCountryLoading ? 'Deleting…' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={Boolean(deletePortTarget)} onOpenChange={(o) => !o && setDeletePortTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete port?</AlertDialogTitle>
            <AlertDialogDescription>
              {deletePortTarget ? `Remove port “${deletePortTarget.name}”?` : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletePortLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className='bg-red-600 hover:bg-red-700'
              disabled={deletePortLoading}
              onClick={(e) => {
                e.preventDefault()
                void confirmDeletePort()
              }}
            >
              {deletePortLoading ? 'Deleting…' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </CustomsPage>
  )
}
