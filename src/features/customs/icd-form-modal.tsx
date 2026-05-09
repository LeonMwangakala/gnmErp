import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { customsIcdApi, type CustomsIcd, type SaveCustomsIcdPayload } from '@/lib/api'

type IcdFormModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  icdId: number | null
  onSaved: () => void
  viewOnly?: boolean
}

type IcdForm = {
  name: string
  description: string
}

const initialForm: IcdForm = {
  name: '',
  description: '',
}

function icdToForm(row: CustomsIcd): IcdForm {
  return {
    name: row.name,
    description: row.description ?? '',
  }
}

function toSavePayload(form: IcdForm): SaveCustomsIcdPayload {
  return {
    name: form.name.trim(),
    description: form.description.trim() || undefined,
  }
}

export function IcdFormModal({
  open,
  onOpenChange,
  icdId,
  onSaved,
  viewOnly = false,
}: IcdFormModalProps) {
  const [form, setForm] = useState<IcdForm>(initialForm)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  const update = <K extends keyof IcdForm>(key: K, value: IcdForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  useEffect(() => {
    if (!open) return
    if (!icdId) {
      setForm(initialForm)
      return
    }
    let cancelled = false
    setLoading(true)
    customsIcdApi
      .get(icdId)
      .then((row) => {
        if (!cancelled) setForm(icdToForm(row))
      })
      .catch(() => {
        if (!cancelled) toast.error('Failed to load ICD location')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [open, icdId])

  const handleSave = async () => {
    const payload = toSavePayload(form)
    if (!payload.name) {
      toast.error('Name is required')
      return
    }
    setSaving(true)
    try {
      if (icdId != null) {
        await customsIcdApi.update(icdId, payload)
      } else {
        await customsIcdApi.create(payload)
      }
      onSaved()
      toast.success(icdId != null ? 'ICD location updated' : 'ICD location created')
      onOpenChange(false)
    } catch {
      // axios interceptor may toast
    } finally {
      setSaving(false)
    }
  }

  const readOnly = viewOnly || loading

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-lg'>
        <DialogHeader>
          <DialogTitle>
            {!icdId ? 'Add ICD location' : viewOnly ? 'ICD location' : 'Edit ICD location'}
          </DialogTitle>
        </DialogHeader>

        <div className='grid gap-3 py-2'>
          <div className='space-y-1'>
            <Label>Name</Label>
            <Input
              value={form.name}
              onChange={(e) => update('name', e.target.value)}
              disabled={readOnly}
              placeholder='e.g. ICD Dar es Salaam'
            />
          </div>
          <div className='space-y-1'>
            <Label>Description (optional)</Label>
            <Textarea
              value={form.description}
              onChange={(e) => update('description', e.target.value)}
              disabled={readOnly}
              rows={4}
              placeholder='Notes or address details'
            />
          </div>
        </div>

        <DialogFooter>
          <Button type='button' variant='outline' onClick={() => onOpenChange(false)}>
            {viewOnly ? 'Close' : 'Cancel'}
          </Button>
          {!viewOnly ? (
            <Button type='button' onClick={() => void handleSave()} disabled={saving || loading}>
              {saving ? 'Saving…' : 'Save'}
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
