'use client'

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar
} from 'recharts'
import { sectorLabels } from '@/lib/utils'
import { Sector } from '@/types'

interface TrendData {
  date: string
  new_leads: number
  contacted: number
}

interface LeadsChartProps {
  data: TrendData[]
}

export function LeadsChart({ data }: LeadsChartProps) {
  // Format dates for display
  const formattedData = data.map(d => ({
    ...d,
    date: new Date(d.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
  }))
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Évolution des leads</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={formattedData}>
              <defs>
                <linearGradient id="colorNewLeads" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorContacted" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 12 }} 
                stroke="#a1a1aa"
                tickLine={false}
              />
              <YAxis 
                tick={{ fontSize: 12 }} 
                stroke="#a1a1aa"
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e4e4e7',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                }}
              />
              <Area
                type="monotone"
                dataKey="new_leads"
                name="Nouveaux leads"
                stroke="#f59e0b"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorNewLeads)"
              />
              <Area
                type="monotone"
                dataKey="contacted"
                name="Contactés"
                stroke="#10b981"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorContacted)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

interface SectorData {
  sector: Sector
  count: number
}

interface SectorsChartProps {
  data: SectorData[]
}

export function SectorsChart({ data }: SectorsChartProps) {
  const formattedData = data.map(d => ({
    name: sectorLabels[d.sector]?.replace(/^.+\s/, '') || d.sector,
    fullName: sectorLabels[d.sector] || d.sector,
    count: d.count
  }))
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Top secteurs</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={formattedData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" horizontal={true} vertical={false} />
              <XAxis type="number" tick={{ fontSize: 12 }} stroke="#a1a1aa" tickLine={false} />
              <YAxis 
                type="category" 
                dataKey="name" 
                tick={{ fontSize: 12 }} 
                stroke="#a1a1aa" 
                tickLine={false}
                axisLine={false}
                width={80}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e4e4e7',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                }}
                formatter={(value, name, props) => [value, props.payload.fullName]}
              />
              <Bar 
                dataKey="count" 
                fill="#f59e0b" 
                radius={[0, 4, 4, 0]}
                name="Leads"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
