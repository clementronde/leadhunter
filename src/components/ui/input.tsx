import * as React from 'react'
import { cn } from '@/lib/utils'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ReactNode
  error?: string
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, icon, error, ...props }, ref) => {
    return (
      <div className="relative w-full">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 [&_svg]:size-4">
            {icon}
          </div>
        )}
        <input
          type={type}
          className={cn(
            'flex h-9 w-full rounded-lg border border-hairline bg-surface-1 px-3 py-2 text-sm text-zinc-100 transition-colors hover:border-hairline-strong',
            'file:border-0 file:bg-transparent file:text-sm file:font-medium',
            'placeholder:text-zinc-500',
            'focus:outline-none focus:border-amber-500/60 focus:ring-2 focus:ring-amber-500/20',
            'disabled:cursor-not-allowed disabled:opacity-50',
            icon && 'pl-10',
            error && 'border-red-500/70 focus:border-red-500 focus:ring-red-500/20',
            className
          )}
          ref={ref}
          {...props}
        />
        {error && (
          <p className="mt-1 text-xs text-red-400">{error}</p>
        )}
      </div>
    )
  }
)
Input.displayName = 'Input'

export { Input }
