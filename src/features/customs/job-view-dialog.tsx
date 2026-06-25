import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { CustomsCreateJob } from './jobs-create'

type JobViewDialogProps = {
  jobId: number | null
  jobLabel?: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function JobViewDialog({
  jobId,
  jobLabel,
  open,
  onOpenChange,
}: JobViewDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='flex max-h-[92vh] w-full max-w-[calc(100%-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-6xl'>
        <DialogHeader className='shrink-0 border-b px-6 py-4'>
          <DialogTitle>{jobLabel ? `Job ${jobLabel}` : 'View job'}</DialogTitle>
        </DialogHeader>
        <div className='min-h-0 flex-1 overflow-y-auto px-6 py-4'>
          {open && jobId ? (
            <CustomsCreateJob
              embedded={{
                mode: 'view',
                jobId,
                onClose: () => onOpenChange(false),
              }}
            />
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  )
}
