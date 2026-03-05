/**
 * Rate limiter en mémoire — simple, sans Redis.
 * Suffisant pour une application mono-instance (Vercel serverless = ok car les
 * routes API sont protégées par les quotas Supabase en amont).
 *
 * Sliding window : on compte les requêtes sur les `windowMs` dernières ms.
 */

interface RateLimitEntry {
  timestamps: number[]
}

const store = new Map<string, RateLimitEntry>()

// Nettoyage périodique pour éviter les fuites mémoire
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of store.entries()) {
    if (entry.timestamps.every((t) => now - t > 60_000)) {
      store.delete(key)
    }
  }
}, 60_000)

export interface RateLimitOptions {
  /** Durée de la fenêtre en ms (défaut : 60 000 = 1 min) */
  windowMs?: number
  /** Nombre max de requêtes dans la fenêtre (défaut : 20) */
  max?: number
}

export interface RateLimitResult {
  success: boolean
  remaining: number
  reset: number // timestamp epoch ms
}

export function rateLimit(key: string, options: RateLimitOptions = {}): RateLimitResult {
  const { windowMs = 60_000, max = 20 } = options
  const now = Date.now()
  const cutoff = now - windowMs

  let entry = store.get(key)
  if (!entry) {
    entry = { timestamps: [] }
    store.set(key, entry)
  }

  // Supprimer les timestamps hors fenêtre
  entry.timestamps = entry.timestamps.filter((t) => t > cutoff)

  if (entry.timestamps.length >= max) {
    const oldestInWindow = entry.timestamps[0]
    return {
      success: false,
      remaining: 0,
      reset: oldestInWindow + windowMs,
    }
  }

  entry.timestamps.push(now)
  return {
    success: true,
    remaining: max - entry.timestamps.length,
    reset: now + windowMs,
  }
}
