import { Check } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import {
  JOB_STAGE_ORDER,
  type JobStage,
  type JobStageProgress,
} from './jobs-storage'

export const JOB_STAGE_LABELS: Record<JobStage, string> = {
  SHIPPING_LINE: 'Shipping',
  DECLARATION_TRA: 'Declaration',
  PORT: 'Port',
  TBS: 'TBS',
}

const JOB_STAGE_SHORT_LABELS: Record<JobStage, string> = {
  SHIPPING_LINE: 'S',
  DECLARATION_TRA: 'D',
  PORT: 'P',
  TBS: 'T',
}

const STAGE_SEGMENT_STYLES = {
  completed: 'border-emerald-600/30 bg-emerald-600 text-white',
  current: 'border-amber-500/40 bg-amber-100 text-amber-900 dark:bg-amber-500/20 dark:text-amber-100',
  pending: 'border-slate-200 bg-slate-100 text-slate-500 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-400',
} as const

function getStageSegmentState(
  progress: JobStageProgress,
  stage: JobStage
): keyof typeof STAGE_SEGMENT_STYLES {
  if (progress[stage] === 'COMPLETED') {
    return 'completed'
  }
  const firstIncomplete = JOB_STAGE_ORDER.find((s) => progress[s] !== 'COMPLETED')
  return stage === firstIncomplete ? 'current' : 'pending'
}

function getProgressCountStyle(completedCount: number, total: number): string {
  if (completedCount === total) {
    return 'font-medium text-emerald-700 dark:text-emerald-400'
  }
  if (completedCount > 0) {
    return 'font-medium text-amber-700 dark:text-amber-400'
  }
  return 'text-muted-foreground'
}

type JobStageProgressIndicatorProps = {
  progress: JobStageProgress
}

export function JobStageProgressIndicator({ progress }: JobStageProgressIndicatorProps) {
  const completedCount = JOB_STAGE_ORDER.filter(
    (stage) => progress[stage] === 'COMPLETED'
  ).length
  const total = JOB_STAGE_ORDER.length

  return (
    <div className='flex items-center gap-2'>
      <div className='flex overflow-hidden rounded-md border border-border'>
        {JOB_STAGE_ORDER.map((stage) => {
          const segmentState = getStageSegmentState(progress, stage)
          const done = segmentState === 'completed'
          const statusLabel =
            segmentState === 'completed'
              ? 'Completed'
              : segmentState === 'current'
                ? 'In progress'
                : 'Pending'
          return (
            <Tooltip key={stage}>
              <TooltipTrigger asChild>
                <div
                  className={cn(
                    'flex h-7 min-w-7 items-center justify-center border-r px-1 text-[10px] font-semibold last:border-r-0',
                    STAGE_SEGMENT_STYLES[segmentState]
                  )}
                  aria-label={`${JOB_STAGE_LABELS[stage]}: ${statusLabel}`}
                >
                  {done ? (
                    <Check className='h-3.5 w-3.5' strokeWidth={3} />
                  ) : (
                    JOB_STAGE_SHORT_LABELS[stage]
                  )}
                </div>
              </TooltipTrigger>
              <TooltipContent side='top'>
                {JOB_STAGE_LABELS[stage]}: {statusLabel}
              </TooltipContent>
            </Tooltip>
          )
        })}
      </div>
      <span
        className={cn(
          'text-xs tabular-nums',
          getProgressCountStyle(completedCount, total)
        )}
      >
        {completedCount}/{total}
      </span>
    </div>
  )
}
