'use client'

import { useState, useRef } from 'react'
import { Upload, FileText, Check, X, Loader2, AlertTriangle } from 'lucide-react'
import { leadsApi } from '@/lib/api'
import { CreateCompanyInput } from '@/types'

interface ParsedRow {
  name: string
  city: string
  postal_code: string
  phone?: string
  email?: string
  website?: string
  sector?: string
}

interface CsvImportProps {
  onImported: (count: number) => void
  onClose: () => void
}

const COLUMN_MAP: Record<string, keyof ParsedRow> = {
  nom: 'name', name: 'name', entreprise: 'name', société: 'name', etablissement: 'name',
  ville: 'city', city: 'city',
  'code postal': 'postal_code', postal_code: 'postal_code', cp: 'postal_code', zip: 'postal_code',
  téléphone: 'phone', telephone: 'phone', phone: 'phone', tel: 'phone',
  email: 'email', mail: 'email', courriel: 'email',
  site: 'website', website: 'website', 'site web': 'website', url: 'website',
  secteur: 'sector', sector: 'sector', activité: 'sector',
}

function parseCSV(text: string): ParsedRow[] {
  const sep = text.includes(';') ? ';' : ','
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean)
  if (lines.length < 2) return []

  const headers = lines[0].split(sep).map((h) =>
    h.replace(/^["']|["']$/g, '').toLowerCase().trim()
  )
  const mappedKeys = headers.map((h) => COLUMN_MAP[h] ?? null)

  return lines.slice(1).map((line) => {
    const values = line.split(sep).map((v) => v.replace(/^["']|["']$/g, '').trim())
    const row: Partial<ParsedRow> = {}
    mappedKeys.forEach((key, i) => {
      if (key && values[i]) row[key] = values[i]
    })
    return row as ParsedRow
  }).filter((r) => r.name && r.city)
}

export function CsvImport({ onImported, onClose }: CsvImportProps) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [rows, setRows] = useState<ParsedRow[]>([])
  const [fileName, setFileName] = useState('')
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [importedCount, setImportedCount] = useState(0)

  const handleFile = (file: File) => {
    setError(null)
    setRows([])
    setDone(false)
    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      const parsed = parseCSV(text)
      if (parsed.length === 0) {
        setError('Aucune ligne valide trouvée. Vérifiez que le fichier contient les colonnes "Nom" et "Ville".')
      } else {
        setRows(parsed)
      }
    }
    reader.readAsText(file, 'utf-8')
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  const handleImport = async () => {
    setImporting(true)
    let count = 0
    for (const row of rows) {
      try {
        const hasWebsite = !!(row.website && row.website !== '')
        const input: CreateCompanyInput = {
          name: row.name,
          city: row.city,
          postal_code: row.postal_code || '',
          address: null,
          coordinates: null,
          phone: row.phone || null,
          email: row.email || null,
          siret: null,
          sector: null,
          source: 'import',
          website: row.website || null,
          has_website: hasWebsite,
          prospect_score: hasWebsite ? 40 : 70,
          priority: hasWebsite ? 'warm' : 'hot',
          status: 'new',
          last_contacted_at: null,
        }
        await leadsApi.create(input)
        count++
      } catch {}
    }
    setImportedCount(count)
    setDone(true)
    setImporting(false)
    onImported(count)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-lg rounded-2xl border border-white/[0.08] bg-zinc-900/95 backdrop-blur-xl shadow-2xl shadow-black/60 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/15">
              <FileText className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <h2 className="font-semibold text-white">Importer des leads (CSV)</h2>
              <p className="text-xs text-zinc-500">Colonnes : Nom, Ville, Code postal, Téléphone, Email, Site, Secteur</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-zinc-500 hover:bg-white/5 hover:text-white transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {done ? (
            <div className="text-center py-6">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/20 mx-auto mb-3">
                <Check className="h-7 w-7 text-emerald-400" />
              </div>
              <p className="font-semibold text-white text-lg">{importedCount} leads importés</p>
              <p className="text-sm text-zinc-500 mt-1">Ils sont maintenant dans votre liste de leads.</p>
              <button
                onClick={onClose}
                className="mt-5 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-white text-sm font-semibold hover:opacity-90 transition-opacity"
              >
                Voir mes leads
              </button>
            </div>
          ) : (
            <>
              {/* Drop zone */}
              {rows.length === 0 && (
                <div
                  onDrop={handleDrop}
                  onDragOver={(e) => e.preventDefault()}
                  onClick={() => fileRef.current?.click()}
                  className="flex flex-col items-center justify-center gap-3 p-8 rounded-xl border-2 border-dashed border-white/[0.1] hover:border-amber-500/40 hover:bg-amber-500/[0.03] cursor-pointer transition-all"
                >
                  <Upload className="h-8 w-8 text-zinc-600" />
                  <div className="text-center">
                    <p className="text-sm font-medium text-zinc-300">Glissez votre fichier CSV ici</p>
                    <p className="text-xs text-zinc-600 mt-1">ou cliquez pour parcourir</p>
                  </div>
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".csv,.txt"
                    className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
                  />
                </div>
              )}

              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  {error}
                </div>
              )}

              {rows.length > 0 && (
                <>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-zinc-400">
                      <span className="font-semibold text-white">{rows.length}</span> leads détectés dans <span className="font-mono text-xs text-zinc-500">{fileName}</span>
                    </p>
                    <button onClick={() => { setRows([]); setFileName('') }} className="text-xs text-zinc-600 hover:text-zinc-400">
                      Changer de fichier
                    </button>
                  </div>

                  {/* Preview */}
                  <div className="rounded-lg border border-white/[0.06] overflow-hidden max-h-48 overflow-y-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-zinc-800/60">
                        <tr>
                          {['Nom', 'Ville', 'CP', 'Email', 'Site'].map((h) => (
                            <th key={h} className="px-3 py-2 text-left font-medium text-zinc-500">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/[0.04]">
                        {rows.slice(0, 8).map((row, i) => (
                          <tr key={i} className="hover:bg-white/[0.02]">
                            <td className="px-3 py-2 text-zinc-300 truncate max-w-[120px]">{row.name}</td>
                            <td className="px-3 py-2 text-zinc-400">{row.city}</td>
                            <td className="px-3 py-2 text-zinc-500">{row.postal_code || '—'}</td>
                            <td className="px-3 py-2 text-zinc-500 truncate max-w-[100px]">{row.email || '—'}</td>
                            <td className="px-3 py-2">
                              {row.website
                                ? <span className="text-emerald-400">✓</span>
                                : <span className="text-zinc-700">—</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {rows.length > 8 && (
                      <p className="px-3 py-2 text-xs text-zinc-600 bg-zinc-800/40">
                        + {rows.length - 8} lignes supplémentaires
                      </p>
                    )}
                  </div>

                  <button
                    onClick={handleImport}
                    disabled={importing}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-60"
                  >
                    {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                    {importing ? 'Import en cours...' : `Importer ${rows.length} leads`}
                  </button>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
