'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { Header } from '@/components/layout'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui'
import { Shield, Users, Crown, UserCheck, Loader2 } from 'lucide-react'

interface UserRow {
  id: string
  email: string | null
  plan: string
  role: string
  created_at: string
}

export default function AdminPage() {
  const [users, setUsers] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/admin/users')
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setError(data.error)
        else setUsers(data.users)
      })
      .catch(() => setError('Erreur réseau'))
      .finally(() => setLoading(false))
  }, [])

  const total = users.length
  const admins = users.filter((u) => u.role === 'admin').length
  const pro = users.filter((u) => u.plan === 'pro').length
  const free = users.filter((u) => u.plan !== 'pro').length

  return (
    <div className="min-h-screen">
      <Header
        title="Administration"
        subtitle="Gestion des utilisateurs"
      />

      <div className="p-6 max-w-6xl space-y-6">

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard icon={<Users className="h-5 w-5 text-zinc-400" />} label="Total utilisateurs" value={total} />
          <StatCard icon={<Shield className="h-5 w-5 text-violet-400" />} label="Admins" value={admins} />
          <StatCard icon={<Crown className="h-5 w-5 text-amber-400" />} label="Pro" value={pro} />
          <StatCard icon={<UserCheck className="h-5 w-5 text-zinc-400" />} label="Free" value={free} />
        </div>

        {/* Users table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-violet-400" />
              Utilisateurs
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center gap-2 text-zinc-400 text-sm py-4">
                <Loader2 className="h-4 w-4 animate-spin" />
                Chargement...
              </div>
            ) : error ? (
              <p className="text-red-500 text-sm">{error}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/[0.06] text-left text-zinc-500">
                      <th className="pb-3 font-medium">Email</th>
                      <th className="pb-3 font-medium">Plan</th>
                      <th className="pb-3 font-medium">Rôle</th>
                      <th className="pb-3 font-medium">Inscrit le</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {users.map((u) => (
                      <tr key={u.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="py-3 text-zinc-200 font-medium">
                          {u.email ?? <span className="text-zinc-400 italic">—</span>}
                        </td>
                        <td className="py-3">
                          <PlanBadge plan={u.plan} />
                        </td>
                        <td className="py-3">
                          <RoleBadge role={u.role} />
                        </td>
                        <td className="py-3 text-zinc-500">
                          {new Date(u.created_at).toLocaleDateString('fr-FR')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {users.length === 0 && (
                  <p className="text-center text-zinc-400 text-sm py-8">Aucun utilisateur trouvé.</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  )
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: number
}) {
  return (
    <Card>
      <CardContent className="pt-5">
        <div className="flex items-center gap-3">
          {icon}
          <div>
            <p className="text-2xl font-bold text-white">{value}</p>
            <p className="text-xs text-zinc-500">{label}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function PlanBadge({ plan }: { plan: string }) {
  if (plan === 'pro') {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-600 text-white">
        <Crown className="h-2.5 w-2.5" />
        PRO
      </span>
    )
  }
  return (
    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-zinc-700 text-zinc-400">
      FREE
    </span>
  )
}

function RoleBadge({ role }: { role: string }) {
  if (role === 'admin') {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-gradient-to-r from-violet-600 to-purple-600 text-white">
        <Shield className="h-2.5 w-2.5" />
        ADMIN
      </span>
    )
  }
  return (
    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-zinc-700 text-zinc-400">
      CLIENT
    </span>
  )
}
