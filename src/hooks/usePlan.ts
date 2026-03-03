'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/components/auth/auth-provider'
import { supabase } from '@/lib/supabase'

export const FREE_SCAN_LIMIT = 3
export const FREE_RESULTS_LIMIT = 10

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
    canScan: isPro || scanCountThisMonth < FREE_SCAN_LIMIT,
    canExport: isPro,
    canAudit: isPro,
    FREE_SCAN_LIMIT,
    FREE_RESULTS_LIMIT,
  }
}
