import { cn } from '@/lib/utils'

/** LeadHunter mark: amber tile, dark reticle. Sized by `size` (px). */
export function LogoMark({ size = 20, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      aria-hidden="true"
      className={cn('shrink-0', className)}
    >
      <rect width="20" height="20" rx="5" fill="#e2a336" />
      <circle cx="10" cy="10" r="5.25" fill="none" stroke="#1a1204" strokeWidth="1.75" />
      <circle cx="10" cy="10" r="1.6" fill="#1a1204" />
      <path d="M10 2.5v3M10 14.5v3M2.5 10h3M14.5 10h3" stroke="#1a1204" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  )
}

export function Logo({ size = 20, className }: { size?: number; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <LogoMark size={size} />
      <span className="text-[15px] font-semibold tracking-[-0.02em] text-white">LeadHunter</span>
    </span>
  )
}
