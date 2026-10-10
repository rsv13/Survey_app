// Sends transactional emails (email verification, password reset, deletion
// confirmation).
//
// How it decides where to send:
//   • If a Resend API key is set (RESEND_API_KEY, or SMTP_PASS as a fallback),
//     it sends via Resend's HTTPS API. This matters on hosts like Render that
//     block outbound SMTP ports — HTTPS (443) is always allowed, so it can't
//     hang the way an SMTP connection does.
//   • Otherwise it falls back to Ethereal: a free test inbox for local dev that
//     captures the message and hands back a preview URL.

import nodemailer, { type Transporter } from 'nodemailer'

// Who the email appears to come from. Override with EMAIL_FROM in production.
const FROM = process.env.EMAIL_FROM ?? 'SWSWBS <no-reply@swswbs.local>'

// The Resend API key. We accept SMTP_PASS too so existing setups keep working.
function resendKey(): string | undefined {
  return process.env.RESEND_API_KEY || process.env.SMTP_PASS || undefined
}

// --- Ethereal fallback (local dev only, when no Resend key is configured) ---
let etherealPromise: Promise<Transporter> | null = null
let usingEthereal = false
async function getEthereal(): Promise<Transporter> {
  if (etherealPromise) return etherealPromise
  etherealPromise = (async () => {
    const acct = await nodemailer.createTestAccount()
    usingEthereal = true
    console.log(
      `\n[email] No Resend key set — using an Ethereal test inbox (login: ${acct.user}).`,
    )
    return nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: { user: acct.user, pass: acct.pass },
    })
  })()
  return etherealPromise
}

type Mail = { to: string; subject: string; text: string; html: string }

// Core send. Returns an Ethereal preview URL in dev, or null with Resend.
async function send(mail: Mail): Promise<string | null> {
  const key = resendKey()

  if (key) {
    // Resend HTTPS API — with a timeout so a slow network can never stall the
    // request that's waiting on this (e.g. signup).
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 10_000)
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${key}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: FROM,
          to: mail.to,
          subject: mail.subject,
          text: mail.text,
          html: mail.html,
        }),
        signal: controller.signal,
      })
      if (!res.ok) {
        const body = await res.text().catch(() => '')
        throw new Error(`Resend API ${res.status}: ${body.slice(0, 300)}`)
      }
      return null
    } finally {
      clearTimeout(timer)
    }
  }

  // No key — local dev: use an Ethereal test inbox so you still get a preview.
  const transporter = await getEthereal()
  const info = await transporter.sendMail({ from: FROM, ...mail })
  return usingEthereal ? nodemailer.getTestMessageUrl(info) || null : null
}

// Verification email: carries BOTH a 6-digit code and a one-click link.
export async function sendVerificationEmail(
  to: string,
  verifyUrl: string,
  code: string,
): Promise<string | null> {
  return send({
    to,
    subject: 'Confirm your email — South Wales Social Well-being Scale',
    text:
      `Welcome to the SWSWBS survey.\n\n` +
      `Enter this 6-digit code on the verification page:\n\n    ${code}\n\n` +
      `Or confirm your email in one click with this link:\n${verifyUrl}\n\n` +
      `The code and link expire in 24 hours. If you didn't create an account, you can ignore this email.`,
    html: verificationHtml(verifyUrl, code),
  })
}

export async function sendPasswordResetEmail(
  to: string,
  resetUrl: string,
): Promise<string | null> {
  return send({
    to,
    subject: 'Reset your password — South Wales Social Well-being Scale',
    text:
      `We received a request to reset your SWSWBS password.\n\n` +
      `Set a new password here:\n${resetUrl}\n\n` +
      `This link expires in 1 hour. If you didn't request this, you can safely ignore this email — your password won't change.`,
    html: resetHtml(resetUrl),
  })
}

export async function sendDataDeletionEmail(to: string): Promise<string | null> {
  return send({
    to,
    subject: 'Your data has been deleted — South Wales Social Well-being Scale',
    text:
      `Your request to delete your data has been completed.\n\n` +
      `Your personal details and account have been removed. Any survey responses you gave are kept for ` +
      `research but have been anonymised so they no longer identify you.\n\n` +
      `You're welcome to sign up again at any time if you'd like to take part in future.`,
    html: deletionHtml(),
  })
}

// --- Email bodies (inline styles — email clients strip <style> blocks) ---

function verificationHtml(verifyUrl: string, code: string): string {
  return `
  <div style="margin:0;padding:24px;background:#eef2f7;font-family:Arial,Helvetica,sans-serif;color:#1b2430;">
    <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:14px;padding:32px;">
      <h1 style="margin:0 0 4px;font-size:20px;color:#0a369d;">South Wales Social Well-being Scale</h1>
      <p style="margin:0 0 20px;font-size:13px;color:#77839a;">Well-being today for a stronger tomorrow</p>
      <p style="font-size:15px;line-height:1.5;">Thanks for signing up. Confirm your email with the code below — or the button underneath.</p>
      <p style="margin:24px 0 6px;font-size:13px;color:#77839a;">Your verification code</p>
      <p style="margin:0 0 4px;font-size:34px;font-weight:bold;letter-spacing:8px;color:#0a369d;">${code}</p>
      <p style="margin:0 0 24px;font-size:12px;color:#77839a;">Enter this on the verification page.</p>
      <p style="text-align:center;margin:8px 0 24px;">
        <a href="${verifyUrl}" style="display:inline-block;background:#0a369d;color:#ffffff;text-decoration:none;font-weight:bold;padding:12px 24px;border-radius:10px;">Verify my email</a>
      </p>
      <p style="font-size:13px;color:#465264;line-height:1.5;">Or paste this link into your browser:<br>
        <a href="${verifyUrl}" style="color:#0a369d;word-break:break-all;">${verifyUrl}</a>
      </p>
      <p style="font-size:12px;color:#77839a;margin-top:24px;">The code and link expire in 24 hours. If you didn't create an account, you can safely ignore this email.</p>
    </div>
  </div>`
}

function resetHtml(resetUrl: string): string {
  return `
  <div style="margin:0;padding:24px;background:#eef2f7;font-family:Arial,Helvetica,sans-serif;color:#1b2430;">
    <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:14px;padding:32px;">
      <h1 style="margin:0 0 4px;font-size:20px;color:#0a369d;">South Wales Social Well-being Scale</h1>
      <p style="margin:0 0 20px;font-size:13px;color:#77839a;">Well-being today for a stronger tomorrow</p>
      <p style="font-size:15px;line-height:1.5;">We received a request to reset your password. Click below to choose a new one.</p>
      <p style="text-align:center;margin:28px 0;">
        <a href="${resetUrl}" style="display:inline-block;background:#0a369d;color:#ffffff;text-decoration:none;font-weight:bold;padding:12px 24px;border-radius:10px;">Reset my password</a>
      </p>
      <p style="font-size:13px;color:#465264;line-height:1.5;">Or paste this link into your browser:<br>
        <a href="${resetUrl}" style="color:#0a369d;word-break:break-all;">${resetUrl}</a>
      </p>
      <p style="font-size:12px;color:#77839a;margin-top:24px;">This link expires in 1 hour. If you didn't request a reset, you can ignore this email — your password won't change.</p>
    </div>
  </div>`
}

function deletionHtml(): string {
  return `
  <div style="margin:0;padding:24px;background:#eef2f7;font-family:Arial,Helvetica,sans-serif;color:#1b2430;">
    <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:14px;padding:32px;">
      <h1 style="margin:0 0 4px;font-size:20px;color:#0a369d;">South Wales Social Well-being Scale</h1>
      <p style="margin:0 0 20px;font-size:13px;color:#77839a;">Well-being today for a stronger tomorrow</p>
      <p style="font-size:15px;line-height:1.5;">Your request to delete your data has been completed.</p>
      <p style="font-size:14px;line-height:1.5;color:#465264;">Your personal details and account have been removed. Any survey responses you gave are kept for research but have been anonymised so they no longer identify you.</p>
      <p style="font-size:14px;line-height:1.5;color:#465264;">You're welcome to sign up again at any time if you'd like to take part in future.</p>
    </div>
  </div>`
}
