import { createClient } from '@supabase/supabase-js'

// Client admin avec service role key (bypass RLS) — serveur uniquement
// Ne jamais importer ce fichier dans des composants client
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)
