'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/components/auth/auth-provider'
import { supabase } from '@/lib/supabase'

export function usePlan() {
  const { user, isPro } = useAuth()
  const [scanCountThisMonth, setScanCountThisMonth] = useState(0)

  useEffect(() => {
    if (!user) return

    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

    supabase
      .from('search_scans')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('started_at', startOfMonth)
      .then(({ count }) => {
        setScanCountThisMonth(count ?? 0)
      })
  }, [user])

  return {
    isPro,
    scanCountThisMonth,
    canScan: isPro || scanCountThisMonth < 50,
    canExport: isPro,
    canAudit: isPro,
  }
}
