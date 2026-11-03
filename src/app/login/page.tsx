'use client'

import { Suspense, useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'
import { useAuth } from '@/components/auth/auth-provider'
import { LogoMark } from '@/components/ui/logo'

/** Only same-origin relative paths are accepted as a post-login destination. */
function safeNext(raw: string | null): string {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//')) return '/today'
  return raw
}

const inputClass =
  'h-10 w-full rounded-lg border border-hairline bg-surface-1 px-3 text-[14px] text-zinc-100 placeholder:text-zinc-500 transition-colors hover:border-hairline-strong focus:border-amber-500/60 focus:outline-none focus:ring-2 focus:ring-amber-500/20'

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-canvas" />}>
      <LoginForm />
    </Suspense>
  )
}

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { signIn, signUp, signInWithGoogle, user, loading: authLoading } = useAuth()

  const [mode, setMode] = useState<'login' | 'register'>(searchParams.get('mode') === 'register' ? 'register' : 'login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  // Keep ?next=/scanner?... across the OAuth round-trip
  useEffect(() => {
    const next = searchParams.get('next')
    if (next) {
      try { sessionStorage.setItem('lh-next', safeNext(next)) } catch {}
    }
  }, [searchParams])

  // Redirect once the auth state is really updated (after onAuthStateChange)
  useEffect(() => {
    if (!authLoading && user) {
      let target = '/today'
      try {
        target = safeNext(sessionStorage.getItem('lh-next'))
        sessionStorage.removeItem('lh-next')
      } catch {}
      router.replace(target)
    }
  }, [user, authLoading, router])

  const switchMode = (next: 'login' | 'register') => {
    setMode(next)
    setError(null)
    setMessage(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setMessage(null)

    if (mode === 'login') {
      const { error } = await signIn(email, password)
      if (error) {
        const isInvalidCredentials = error.toLowerCase().includes('invalid') || error.toLowerCase().includes('credentials')
        setError(isInvalidCredentials
          ? 'Email ou mot de passe incorrect. Pas encore de compte ? Créez-en un juste en dessous.'
          : error
        )
      }
    } else {
      const { error } = await signUp(email, password)
      if (error) {
        setError(error)
      } else {
        setMessage('Compte créé. Ouvrez le lien reçu par email pour confirmer votre adresse.')
      }
    }

    setLoading(false)
  }

  const handleGoogleSignIn = async () => {
    setError(null)
    await signInWithGoogle()
  }

  return (
    <div className="flex min-h-screen flex-col bg-canvas px-4">
      <div className="mx-auto flex h-14 w-full max-w-[1200px] items-center">
        <Link href="/" className="inline-flex items-center gap-2 rounded-md text-[14px] font-semibold text-white">
          <LogoMark size={20} /> LeadHunter
        </Link>
      </div>

      <div className="mx-auto flex w-full max-w-[360px] flex-1 flex-col justify-center pb-24">
        <h1 className="text-[24px] font-semibold tracking-[-0.02em] text-white">
          {mode === 'login' ? 'Connexion' : 'Créer votre compte'}
        </h1>
        <p className="mt-1.5 text-[14px] text-zinc-500">
          {mode === 'login'
            ? 'Retrouvez vos leads et vos relances du jour.'
            : '3 scans gratuits par mois, sans carte bancaire.'}
        </p>

        <button
          onClick={handleGoogleSignIn}
          className="mt-8 flex h-10 w-full items-center justify-center gap-2.5 rounded-lg border border-hairline-strong bg-surface-1 text-[14px] font-medium text-zinc-100 transition-colors hover:bg-surface-3"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Continuer avec Google
        </button>

        <div className="my-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-hairline" />
          <span className="text-[12px] text-zinc-600">ou avec un email</span>
          <div className="h-px flex-1 bg-hairline" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="email" className="text-[13px] text-zinc-400">Email</label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="vous@agence.fr"
              className={inputClass}
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="password" className="text-[13px] text-zinc-400">Mot de passe</label>
            <input
              id="password"
              type="password"
              required
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
              aria-describedby={mode === 'register' ? 'pw-hint' : undefined}
              className={inputClass}
            />
            {mode === 'register' && (
              <p id="pw-hint" className="text-[12px] text-zinc-500">6 caractères minimum.</p>
            )}
          </div>

          {error && (
            <p role="alert" className="rounded-lg border border-red-500/25 bg-red-500/10 px-3 py-2.5 text-[13px] text-red-300">
              {error}
            </p>
          )}

          {message && (
            <p role="status" className="rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-3 py-2.5 text-[13px] text-emerald-300">
              {message}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-amber-500 text-[14px] font-medium text-on-accent transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {mode === 'login' ? 'Se connecter' : 'Créer mon compte'}
          </button>
        </form>

        <p className="mt-6 text-center text-[13px] text-zinc-500">
          {mode === 'login' ? 'Pas encore de compte ?' : 'Déjà un compte ?'}{' '}
          <button
            type="button"
            onClick={() => switchMode(mode === 'login' ? 'register' : 'login')}
            className="text-zinc-200 underline decoration-zinc-600 underline-offset-4 transition-colors hover:decoration-zinc-300"
          >
            {mode === 'login' ? 'Créer un compte' : 'Se connecter'}
          </button>
        </p>
      </div>
    </div>
  )
}
