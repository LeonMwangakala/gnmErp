'use client'

import * as React from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'

interface AccordionContextValue {
  value: string | string[] | undefined
  onValueChange: (value: string | string[]) => void
  type: 'single' | 'multiple'
  collapsible: boolean
}

const AccordionContext = React.createContext<AccordionContextValue | null>(null)

interface AccordionProps {
  type?: 'single' | 'multiple'
  value?: string | string[]
  defaultValue?: string | string[]
  onValueChange?: (value: string | string[]) => void
  collapsible?: boolean
  children: React.ReactNode
  className?: string
}

const Accordion = React.forwardRef<HTMLDivElement, AccordionProps>(
  ({ type = 'single', value, defaultValue, onValueChange, collapsible = true, children, className }, ref) => {
    const [internalValue, setInternalValue] = React.useState<string | string[]>(
      defaultValue || (type === 'multiple' ? [] : '')
    )
    const controlledValue = value !== undefined ? value : internalValue
    const handleValueChange = React.useCallback(
      (newValue: string | string[]) => {
        if (onValueChange) {
          onValueChange(newValue)
        } else {
          setInternalValue(newValue)
        }
      },
      [onValueChange]
    )

    const contextValue = React.useMemo<AccordionContextValue>(
      () => ({
        value: controlledValue,
        onValueChange: handleValueChange,
        type,
        collapsible,
      }),
      [controlledValue, handleValueChange, type, collapsible]
    )

    return (
      <AccordionContext.Provider value={contextValue}>
        <div ref={ref} className={cn('w-full', className)}>
          {children}
        </div>
      </AccordionContext.Provider>
    )
  }
)
Accordion.displayName = 'Accordion'

interface AccordionItemProps {
  value: string
  children: React.ReactNode
  className?: string
}

const AccordionItem = React.forwardRef<HTMLDivElement, AccordionItemProps>(
  ({ value, children, className }, ref) => {
    const context = React.useContext(AccordionContext)
    if (!context) {
      throw new Error('AccordionItem must be used within Accordion')
    }

    const isOpen = context.type === 'multiple'
      ? Array.isArray(context.value) && context.value.includes(value)
      : context.value === value

    const handleOpenChange = (open: boolean) => {
      if (context.type === 'multiple') {
        const currentValue = Array.isArray(context.value) ? context.value : []
        const newValue = open
          ? [...currentValue, value]
          : currentValue.filter((v) => v !== value)
        context.onValueChange(newValue)
      } else {
        context.onValueChange(open ? value : context.collapsible ? '' : value)
      }
    }

    return (
      <Collapsible
        ref={ref}
        open={isOpen}
        onOpenChange={handleOpenChange}
        className={cn('border-b', className)}
      >
        {children}
      </Collapsible>
    )
  }
)
AccordionItem.displayName = 'AccordionItem'

interface AccordionTriggerProps {
  children: React.ReactNode
  className?: string
}

const AccordionTrigger = React.forwardRef<HTMLButtonElement, AccordionTriggerProps>(
  ({ children, className }, ref) => {
    return (
      <CollapsibleTrigger
        ref={ref}
        className={cn(
          'flex w-full items-center justify-between py-4 font-medium transition-all hover:underline [&[data-state=open]>svg]:rotate-180',
          className
        )}
      >
        {children}
        <ChevronDown className='h-4 w-4 shrink-0 transition-transform duration-200' />
      </CollapsibleTrigger>
    )
  }
)
AccordionTrigger.displayName = 'AccordionTrigger'

interface AccordionContentProps {
  children: React.ReactNode
  className?: string
}

const AccordionContent = React.forwardRef<HTMLDivElement, AccordionContentProps>(
  ({ children, className }, ref) => {
    return (
      <CollapsibleContent
        ref={ref}
        className='overflow-hidden text-sm transition-all'
      >
        <div className={cn('pb-4 pt-0', className)}>{children}</div>
      </CollapsibleContent>
    )
  }
)
AccordionContent.displayName = 'AccordionContent'

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent }
