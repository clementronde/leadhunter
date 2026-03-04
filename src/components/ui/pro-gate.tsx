'use client'

import { Lock } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface ProGateProps {
  children: React.ReactNode
  isPro: boolean
  reason?: 'scan_limit' | 'export' | 'audit'
  variant?: 'locked' | 'badge'
  onUpgrade?: () => void
}

export function ProGate({
  children,
  isPro,
  reason: _reason,
  variant = 'locked',
  onUpgrade,
}: ProGateProps) {
  const router = useRouter()

  if (isPro) return <>{children}</>

  const handleClick = () => {
    if (onUpgrade) {
      onUpgrade()
    } else {
      router.push('/upgrade')
    }
  }

  if (variant === 'badge') {
    return (
      <div className="relative inline-flex">
        <div className="pointer-events-none opacity-60 select-none">{children}</div>
        <button
          onClick={handleClick}
          className="absolute -top-1.5 -right-1.5 flex items-center gap-0.5 bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-sm hover:bg-amber-600 transition-colors z-10"
          title="Fonctionnalité Pro"
        >
          <Lock className="h-2.5 w-2.5" />
          Pro
        </button>
      </div>
    )
  }

  // variant === 'locked' — full overlay
  return (
    <div className="relative">
      <div className="pointer-events-none opacity-40 select-none blur-[1px]">{children}</div>
      <div className="absolute inset-0 flex items-center justify-center">
        <button
          onClick={handleClick}
          className="flex items-center gap-2 bg-zinc-900/90 backdrop-blur-sm border border-amber-500/30 text-amber-400 text-sm font-semibold px-4 py-2 rounded-xl shadow-lg hover:bg-zinc-800/90 transition-colors"
        >
          <Lock className="h-4 w-4" />
          Fonctionnalité Pro
        </button>
      </div>
    </div>
  )
}
