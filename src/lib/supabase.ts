import { createBrowserClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Client browser pour les composants client (avec gestion auto des cookies)
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey)

// Client server-side pour les API routes (utilise le service role ou anon key)
export function createServerSupabaseClient() {
  return createClient(supabaseUrl, supabaseAnonKey)
}

// Client admin avec service role key (bypass RLS) — serveur uniquement
export const supabaseAdmin = createClient(
  supabaseUrl,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)
