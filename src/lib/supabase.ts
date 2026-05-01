import { createBrowserClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'

// Fallback values prevent crashes during SSR/build when env vars are absent.
// At runtime in the browser the real env vars are always present.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder-anon-key'

export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey)

export function createServerSupabaseClient() {
  return createClient(supabaseUrl, supabaseAnonKey)
}
