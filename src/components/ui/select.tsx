import * as React from 'react'
import { cn } from '@/lib/utils'
import { ChevronDown } from 'lucide-react'

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  options: { value: string; label: string }[]
  placeholder?: string
}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, options, placeholder, ...props }, ref) => {
    return (
      <div className="relative">
        <select
          className={cn(
            'flex h-9 w-full appearance-none rounded-lg border border-hairline bg-surface-1 px-3 py-1.5 pr-9 text-sm text-zinc-100 transition-colors hover:border-hairline-strong',
            'focus:outline-none focus:border-amber-500/60 focus:ring-2 focus:ring-amber-500/20',
            'disabled:cursor-not-allowed disabled:opacity-50',
            className
          )}
          ref={ref}
          {...props}
        >
          {placeholder && (
            <option value="" disabled className="bg-zinc-900 text-zinc-400">
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option key={option.value} value={option.value} className="bg-zinc-900 text-zinc-200">
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500 pointer-events-none" />
      </div>
    )
  }
)
Select.displayName = 'Select'

export { Select }
