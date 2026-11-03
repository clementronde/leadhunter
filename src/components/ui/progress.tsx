import * as React from 'react'
import { cn } from '@/lib/utils'

interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number
  max?: number
  showLabel?: boolean
  color?: 'default' | 'success' | 'warning' | 'danger'
}

const colorVariants = {
  default: 'bg-zinc-900',
  success: 'bg-emerald-500',
  warning: 'bg-amber-500',
  danger: 'bg-red-500',
}

function Progress({
  value,
  max = 100,
  showLabel = false,
  color = 'default',
  className,
  ...props
}: ProgressProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100)

  return (
    <div className={cn('relative', className)} {...props}>
      <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-200">
        <div
          className={cn(
            'h-full transition-all duration-500 ease-out rounded-full',
            colorVariants[color]
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {showLabel && (
        <span className="absolute -top-6 right-0 text-xs font-medium text-zinc-600">
          {Math.round(percentage)}%
        </span>
      )}
    </div>
  )
}

export { Progress }
