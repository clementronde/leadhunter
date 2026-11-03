import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-[background-color,border-color,color,transform] duration-150 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500/75 disabled:pointer-events-none disabled:opacity-40 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 select-none active:translate-y-px',
  {
    variants: {
      variant: {
        default: 'bg-amber-500 text-on-accent hover:bg-accent-hover',
        destructive: 'bg-red-600 text-white hover:bg-red-500',
        outline: 'border border-hairline-strong bg-surface-1 text-zinc-200 hover:bg-surface-3 hover:text-white',
        secondary: 'border border-hairline bg-surface-2 text-zinc-200 hover:bg-surface-3 hover:text-white',
        ghost: 'text-zinc-400 hover:bg-white/[0.05] hover:text-white',
        link: 'text-amber-400 underline-offset-4 hover:underline',
        success: 'bg-emerald-600 text-white hover:bg-emerald-500',
      },
      size: {
        default: 'h-9 px-3.5',
        sm: 'h-8 px-3 text-[13px]',
        lg: 'h-10 px-5',
        icon: 'h-9 w-9',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, loading, children, disabled, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading && (
          <svg
            className="animate-spin h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        {children}
      </button>
    )
  }
)
Button.displayName = 'Button'

export { Button, buttonVariants }
