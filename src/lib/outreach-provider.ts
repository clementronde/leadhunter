interface SendEmailInput {
  from: string
  to: string
  subject: string
  body: string
  replyTo?: string | null
}

interface SendEmailResult {
  provider: string
  id: string | null
}

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  if (!process.env.RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY non configurée')
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: input.from,
      to: [input.to],
      subject: input.subject,
      text: input.body,
      reply_to: input.replyTo || undefined,
    }),
  })

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    const message =
      typeof data?.message === 'string'
        ? data.message
        : typeof data?.error === 'string'
        ? data.error
        : `Erreur Resend (${response.status})`
    throw new Error(message)
  }

  return { provider: 'resend', id: typeof data?.id === 'string' ? data.id : null }
}

export function formatSender(name: string | null | undefined, email: string): string {
  const trimmedName = name?.trim()
  if (!trimmedName) return email
  return `${trimmedName.replace(/[<>]/g, '')} <${email}>`
}
