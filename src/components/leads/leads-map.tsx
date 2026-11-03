'use client'

import 'leaflet/dist/leaflet.css'
import { useEffect } from 'react'
import Link from 'next/link'
import { CircleMarker, MapContainer, Popup, TileLayer, useMap } from 'react-leaflet'
import { latLngBounds } from 'leaflet'
import { statusLabels } from '@/lib/utils'
import { webPresenceLabels } from '@/lib/web-presence'
import type { Company } from '@/types'

export type MapLead = Pick<
  Company,
  'id' | 'name' | 'city' | 'coordinates' | 'prospect_score' | 'priority' | 'status' | 'web_presence' | 'has_website' | 'phone'
>

const PRIORITY_COLORS: Record<Company['priority'], string> = {
  hot: '#ef4444',
  warm: '#f59e0b',
  cold: '#3b82f6',
}

// Centre de la France si aucun lead n'a de coordonnées
const FRANCE_CENTER: [number, number] = [46.6, 2.4]

function FitBounds({ leads }: { leads: MapLead[] }) {
  const map = useMap()
  useEffect(() => {
    const points = leads.flatMap((lead) => (lead.coordinates ? [[lead.coordinates.lat, lead.coordinates.lng] as [number, number]] : []))
    if (points.length === 0) return
    map.fitBounds(latLngBounds(points), { padding: [40, 40], maxZoom: 15 })
  }, [leads, map])
  return null
}

export default function LeadsMap({ leads }: { leads: MapLead[] }) {
  return (
    <MapContainer center={FRANCE_CENTER} zoom={6} className="h-full w-full rounded-xl" scrollWheelZoom>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitBounds leads={leads} />
      {leads.map((lead) =>
        lead.coordinates ? (
          <CircleMarker
            key={lead.id}
            center={[lead.coordinates.lat, lead.coordinates.lng]}
            radius={5 + Math.round(lead.prospect_score / 20)}
            pathOptions={{
              color: PRIORITY_COLORS[lead.priority],
              fillColor: PRIORITY_COLORS[lead.priority],
              fillOpacity: lead.status === 'new' ? 0.75 : 0.3,
              weight: 1,
            }}
          >
            <Popup>
              <div className="space-y-0.5 text-sm">
                <p className="font-semibold">{lead.name}</p>
                <p>{lead.city} · score {lead.prospect_score}</p>
                <p>{statusLabels[lead.status]} · {webPresenceLabels[lead.web_presence ?? (lead.has_website ? 'website' : 'unknown')]}</p>
                {lead.phone && <p>{lead.phone}</p>}
                <Link href={`/leads/${lead.id}`} className="font-medium text-amber-400">
                  Ouvrir la fiche →
                </Link>
              </div>
            </Popup>
          </CircleMarker>
        ) : null
      )}
    </MapContainer>
  )
}
