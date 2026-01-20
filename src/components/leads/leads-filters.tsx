'use client'

import { Input, Select, Button } from '@/components/ui'
import { LeadFilters, LeadStatus, Priority, Sector } from '@/types'
import { statusLabels, priorityLabels, sectorLabels } from '@/lib/utils'
import { Search, X, Filter, SlidersHorizontal } from 'lucide-react'
import { useState } from 'react'

interface LeadsFiltersProps {
  filters: LeadFilters
  onChange: (filters: LeadFilters) => void
  onReset: () => void
}

export function LeadsFilters({ filters, onChange, onReset }: LeadsFiltersProps) {
  const [showAdvanced, setShowAdvanced] = useState(false)
  
  const statusOptions = [
    { value: '', label: 'Tous les statuts' },
    ...Object.entries(statusLabels).map(([value, label]) => ({ value, label }))
  ]
  
  const priorityOptions = [
    { value: '', label: 'Toutes les priorités' },
    ...Object.entries(priorityLabels).map(([value, label]) => ({ value, label }))
  ]
  
  const sectorOptions = [
    { value: '', label: 'Tous les secteurs' },
    ...Object.entries(sectorLabels).map(([value, label]) => ({ value, label }))
  ]
  
  const websiteOptions = [
    { value: '', label: 'Tous' },
    { value: 'false', label: 'Sans site web' },
    { value: 'true', label: 'Avec site web' }
  ]
  
  const hasActiveFilters = Object.values(filters).some(v => v !== undefined && v !== '')
  
  return (
    <div className="space-y-4">
      {/* Main filters row */}
      <div className="flex flex-wrap gap-3">
        {/* Search */}
        <div className="flex-1 min-w-[200px] max-w-md">
          <Input
            placeholder="Rechercher une entreprise..."
            value={filters.search || ''}
            onChange={(e) => onChange({ ...filters, search: e.target.value || undefined })}
            icon={<Search className="h-4 w-4" />}
          />
        </div>
        
        {/* Status */}
        <Select
          options={statusOptions}
          value={filters.status || ''}
          onChange={(e) => onChange({ ...filters, status: (e.target.value || undefined) as LeadStatus })}
          className="w-40"
        />
        
        {/* Priority */}
        <Select
          options={priorityOptions}
          value={filters.priority || ''}
          onChange={(e) => onChange({ ...filters, priority: (e.target.value || undefined) as Priority })}
          className="w-44"
        />
        
        {/* Website */}
        <Select
          options={websiteOptions}
          value={filters.has_website === undefined ? '' : String(filters.has_website)}
          onChange={(e) => onChange({ 
            ...filters, 
            has_website: e.target.value === '' ? undefined : e.target.value === 'true'
          })}
          className="w-36"
        />
        
        {/* Advanced toggle */}
        <Button
          variant="outline"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className={showAdvanced ? 'bg-zinc-100' : ''}
        >
          <SlidersHorizontal className="h-4 w-4" />
          Plus de filtres
        </Button>
        
        {/* Reset */}
        {hasActiveFilters && (
          <Button variant="ghost" onClick={onReset}>
            <X className="h-4 w-4" />
            Réinitialiser
          </Button>
        )}
      </div>
      
      {/* Advanced filters */}
      {showAdvanced && (
        <div className="flex flex-wrap gap-3 p-4 bg-zinc-50 rounded-lg">
          {/* Sector */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-zinc-500">Secteur</label>
            <Select
              options={sectorOptions}
              value={filters.sector || ''}
              onChange={(e) => onChange({ ...filters, sector: (e.target.value || undefined) as Sector })}
              className="w-44"
            />
          </div>
          
          {/* City */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-zinc-500">Ville</label>
            <Input
              placeholder="Ex: Boulogne-Billancourt"
              value={filters.city || ''}
              onChange={(e) => onChange({ ...filters, city: e.target.value || undefined })}
              className="w-48"
            />
          </div>
          
          {/* Score range */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-zinc-500">Score minimum</label>
            <Input
              type="number"
              placeholder="0"
              min={0}
              max={100}
              value={filters.min_score || ''}
              onChange={(e) => onChange({ 
                ...filters, 
                min_score: e.target.value ? parseInt(e.target.value) : undefined 
              })}
              className="w-24"
            />
          </div>
          
          <div className="space-y-1">
            <label className="text-xs font-medium text-zinc-500">Score maximum</label>
            <Input
              type="number"
              placeholder="100"
              min={0}
              max={100}
              value={filters.max_score || ''}
              onChange={(e) => onChange({ 
                ...filters, 
                max_score: e.target.value ? parseInt(e.target.value) : undefined 
              })}
              className="w-24"
            />
          </div>
        </div>
      )}
      
      {/* Active filters badges */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2">
          {filters.search && (
            <FilterBadge 
              label={`Recherche: "${filters.search}"`} 
              onRemove={() => onChange({ ...filters, search: undefined })}
            />
          )}
          {filters.status && (
            <FilterBadge 
              label={`Statut: ${statusLabels[filters.status]}`} 
              onRemove={() => onChange({ ...filters, status: undefined })}
            />
          )}
          {filters.priority && (
            <FilterBadge 
              label={`Priorité: ${priorityLabels[filters.priority]}`} 
              onRemove={() => onChange({ ...filters, priority: undefined })}
            />
          )}
          {filters.sector && (
            <FilterBadge 
              label={`Secteur: ${sectorLabels[filters.sector]}`} 
              onRemove={() => onChange({ ...filters, sector: undefined })}
            />
          )}
          {filters.has_website !== undefined && (
            <FilterBadge 
              label={filters.has_website ? 'Avec site' : 'Sans site'} 
              onRemove={() => onChange({ ...filters, has_website: undefined })}
            />
          )}
          {filters.city && (
            <FilterBadge 
              label={`Ville: ${filters.city}`} 
              onRemove={() => onChange({ ...filters, city: undefined })}
            />
          )}
        </div>
      )}
    </div>
  )
}

function FilterBadge({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-800 text-xs font-medium rounded-full">
      {label}
      <button onClick={onRemove} className="hover:bg-amber-100 rounded-full p-0.5">
        <X className="h-3 w-3" />
      </button>
    </span>
  )
}
