'use client'

import { useEffect, useRef, useState } from 'react'
import { MapPin } from 'lucide-react'
import { cn } from '@/lib/utils'

type CitySuggestion = {
  name: string
  postalCode: string
  population: number
}

interface CityAutocompleteProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  inputClassName?: string
  disabled?: boolean
}

export function CityAutocomplete({
  value,
  onChange,
  placeholder = 'Ex: Lyon, Nantes, Paris 15',
  className,
  inputClassName,
  disabled,
}: CityAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<CitySuggestion[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (value.trim().length < 2) {
      const timeout = setTimeout(() => {
        setSuggestions([])
        setOpen(false)
      }, 0)
      return () => clearTimeout(timeout)
    }

    const controller = new AbortController()
    const timeout = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/cities?q=${encodeURIComponent(value.trim())}`, {
          signal: controller.signal,
        })
        const data = await res.json()
        setSuggestions(data.cities ?? [])
        setOpen(true)
      } catch {
        if (!controller.signal.aborted) {
          setSuggestions([])
          setOpen(false)
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }, 180)

    return () => {
      controller.abort()
      clearTimeout(timeout)
    }
  }, [value])

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const selectCity = (city: CitySuggestion) => {
    onChange(city.name)
    setOpen(false)
  }

  return (
    <div ref={wrapperRef} className={cn('relative w-full', className)}>
      <div className="absolute left-3 top-1/2 z-10 -translate-y-1/2 text-zinc-400">
        <MapPin className="h-4 w-4" />
      </div>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onFocus={() => {
          if (suggestions.length > 0) setOpen(true)
        }}
        disabled={disabled}
        placeholder={placeholder}
        className={cn(
          'flex h-10 w-full rounded-lg border border-white/[0.08] bg-zinc-800/60 px-3 py-2 pl-10 text-sm text-zinc-200 transition-colors',
          'placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-1 focus:ring-offset-zinc-950',
          'disabled:cursor-not-allowed disabled:opacity-50',
          inputClassName
        )}
      />

      {open && (
        <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 overflow-hidden rounded-lg border border-white/[0.08] bg-zinc-950 shadow-xl shadow-black/50">
          {loading && suggestions.length === 0 ? (
            <div className="px-3 py-2 text-sm text-zinc-500">Recherche...</div>
          ) : suggestions.length === 0 ? (
            <div className="px-3 py-2 text-sm text-zinc-500">Aucune ville trouvée</div>
          ) : (
            suggestions.map((city) => (
              <button
                key={`${city.name}-${city.postalCode}`}
                type="button"
                onMouseDown={(event) => {
                  event.preventDefault()
                  selectCity(city)
                }}
                className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm text-zinc-300 transition-colors hover:bg-amber-500/10 hover:text-amber-300"
              >
                <span className="truncate">{city.name}</span>
                <span className="shrink-0 text-xs text-zinc-500">{city.postalCode}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
