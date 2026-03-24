import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { sidebarData } from '@/components/layout/data/sidebar-data'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { toast } from 'sonner'

// Extract all sidebar items recursively
function extractSidebarItems(navGroups: typeof sidebarData.navGroups): Array<{ id: string; label: string; group: string }> {
  const items: Array<{ id: string; label: string; group: string }> = []
  
  navGroups.forEach((group) => {
    const processItem = (item: any, groupTitle: string, parentPath: string = '') => {
      const currentPath = parentPath ? `${parentPath} > ${item.title}` : item.title
      
      if (item.url) {
        // It's a leaf item with a URL
        items.push({
          id: item.url,
          label: item.title,
          group: groupTitle,
        })
      } else if (item.items && Array.isArray(item.items)) {
        // It's a parent item with children - process children recursively
        item.items.forEach((child: any) => {
          processItem(child, groupTitle, currentPath)
        })
      }
      // If it has no URL and no items, it's just a parent label - skip it
    }
    
    group.items.forEach((item) => {
      processItem(item, group.title)
    })
  })
  
  return items
}

const sidebarItems = extractSidebarItems(sidebarData.navGroups)

const displayFormSchema = z.object({
  items: z.array(z.string()).refine((value) => value.some((item) => item), {
    message: 'You have to select at least one item.',
  }),
})

type DisplayFormValues = z.infer<typeof displayFormSchema>

// Default: all items selected
const defaultValues: Partial<DisplayFormValues> = {
  items: sidebarItems.map((item) => item.id),
}

export function DisplayForm() {
  const form = useForm<DisplayFormValues>({
    resolver: zodResolver(displayFormSchema),
    defaultValues,
  })

  // Group items by their nav group
  const groupedItems = sidebarItems.reduce((acc, item) => {
    if (!acc[item.group]) {
      acc[item.group] = []
    }
    acc[item.group].push(item)
    return acc
  }, {} as Record<string, typeof sidebarItems>)

  const onSubmit = async (data: DisplayFormValues) => {
    try {
      // TODO: Implement API call to save display preferences
      // For now, just show success message
      toast.success('Display preferences updated successfully')
      // eslint-disable-next-line no-console
      console.log('Display preferences:', data)
    } catch (error: any) {
      toast.error('Failed to update display preferences: ' + (error?.message || 'Unknown error'))
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-8'>
        <FormField
          control={form.control}
          name='items'
          render={() => (
            <FormItem>
              <div className='mb-4'>
                <FormLabel className='text-base'>Sidebar Items</FormLabel>
                <FormDescription>
                  Select the items you want to display in the sidebar. Uncheck items to hide them.
                </FormDescription>
              </div>
              <FormField
                control={form.control}
                name='items'
                render={({ field }) => (
                  <div className='space-y-6'>
                    {Object.entries(groupedItems).map(([groupTitle, items]) => (
                      <div key={groupTitle} className='space-y-3'>
                        <h3 className='text-sm font-semibold text-foreground'>{groupTitle}</h3>
                        <div className='space-y-2 pl-4'>
                          {items.map((item) => (
                            <FormItem
                              key={item.id}
                              className='flex flex-row items-start space-x-3 space-y-0'
                            >
                              <FormControl>
                                <Checkbox
                                  checked={field.value?.includes(item.id)}
                                  onCheckedChange={(checked) => {
                                    return checked
                                      ? field.onChange([...field.value, item.id])
                                      : field.onChange(
                                          field.value?.filter(
                                            (value) => value !== item.id
                                          )
                                        )
                                  }}
                                />
                              </FormControl>
                              <FormLabel className='font-normal cursor-pointer'>
                                {item.label}
                              </FormLabel>
                            </FormItem>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              />
              <FormMessage />
            </FormItem>
          )}
        />
        <div className='flex items-center gap-2'>
          <Button type='submit'>Update display</Button>
          <Button
            type='button'
            variant='outline'
            onClick={() => {
              form.reset({ items: sidebarItems.map((item) => item.id) })
            }}
          >
            Select all
          </Button>
          <Button
            type='button'
            variant='outline'
            onClick={() => {
              form.reset({ items: [] })
            }}
          >
            Deselect all
          </Button>
        </div>
      </form>
    </Form>
  )
}
