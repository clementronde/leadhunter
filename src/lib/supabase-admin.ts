import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Client admin avec service role key (bypass RLS) — serveur uniquement
// Ne jamais importer ce fichier dans des composants client
// Lazy init pour éviter un crash au build quand les env vars ne sont pas présentes
let _admin: SupabaseClient | null = null

function getAdmin(): SupabaseClient {
  if (!_admin) {
    _admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )
  }
  return _admin
}

export const supabaseAdmin = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    return (getAdmin() as unknown as Record<string | symbol, unknown>)[prop]
  }
})

// Appel direct pour éviter la perte de contexte `this` à travers le Proxy
export async function adminListUsers() {
  return getAdmin().auth.admin.listUsers()
}
