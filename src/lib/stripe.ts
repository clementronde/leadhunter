import Stripe from 'stripe'

// Lazy initialization to avoid build-time crash when STRIPE_SECRET_KEY is absent
let _stripe: Stripe | null = null
export const stripe = new Proxy({} as Stripe, {
  get(_target, prop) {
    if (!_stripe) {
      _stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
        apiVersion: '2026-02-25.clover',
      })
    }
    return (_stripe as unknown as Record<string | symbol, unknown>)[prop]
  },
})
