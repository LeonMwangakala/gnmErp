import { useEffect, useMemo, useState } from 'react'
import { Plus, Search } from 'lucide-react'
import { CustomsPage } from './customs-page'
import { type Shipper, getStoredShippers } from './shippers-storage'
import { AddShipperModal } from './add-shipper-modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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

export function CustomsShipper() {
  const [search, setSearch] = useState('')
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [shippers, setShippers] = useState<Shipper[]>([])

  useEffect(() => {
    setShippers(getStoredShippers())
  }, [])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return shippers
    return shippers.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.city.toLowerCase().includes(q) ||
        s.country.toLowerCase().includes(q) ||
        s.contactName.toLowerCase().includes(q)
    )
  }, [search, shippers])

  return (
    <CustomsPage title='Shipper' description='Manage shipper records for customs jobs.'>
      <Card>
        <CardHeader>
          <div className='flex flex-wrap items-center justify-between gap-3'>
            <div>
              <CardTitle>Shippers</CardTitle>
              <CardDescription>List of all shipper contacts and addresses</CardDescription>
            </div>
            <Button onClick={() => setIsAddOpen(true)}>
              <Plus className='mr-2 h-4 w-4' />
              Add Shipper
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          <div className='relative mb-4 max-w-md'>
            <Search className='absolute left-2 top-2.5 h-4 w-4 text-muted-foreground' />
            <Input
              className='pl-8'
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder='Search shipper by name, city, country, contact'
            />
          </div>

          <div className='rounded-md border'>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>S/N</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Country</TableHead>
                  <TableHead>City</TableHead>
                  <TableHead>Contact Name</TableHead>
                  <TableHead>Tel. No.</TableHead>
                  <TableHead>Email</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className='py-8 text-center text-muted-foreground'>
                      No shippers yet. Click "Add Shipper" to create one.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((shipper, index) => (
                    <TableRow key={shipper.id}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell className='font-medium'>{shipper.name}</TableCell>
                      <TableCell>{shipper.country || '-'}</TableCell>
                      <TableCell>{shipper.city || '-'}</TableCell>
                      <TableCell>{shipper.contactName || '-'}</TableCell>
                      <TableCell>{shipper.telNo || '-'}</TableCell>
                      <TableCell>{shipper.email || shipper.contactEmail || '-'}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <AddShipperModal
        open={isAddOpen}
        onOpenChange={setIsAddOpen}
        onCreated={(created) => setShippers((prev) => [created, ...prev])}
      />
    </CustomsPage>
  )
}
