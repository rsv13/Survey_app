// Sends transactional emails (email verification and password reset).
//
// How it decides where to send:
//   • If SMTP_HOST is set in the environment, it uses that real mail server
//     (production uses Resend over SMTP).
//   • If not, it falls back to Ethereal: a free test inbox that captures the
//     message and hands back a preview URL you open in the browser.
//
// Going live means setting the SMTP_* env vars — the templates, tokens, codes
// and links below are exactly what real users receive.

import nodemailer, { type Transporter } from 'nodemailer'

// We build the transporter once and reuse it (creating an Ethereal account
// hits the network, so we don't want to do it on every signup).
let transporterPromise: Promise<Transporter> | null = null
let usingEthereal = false

async function getTransporter(): Promise<Transporter> {
  if (transporterPromise) return transporterPromise

  transporterPromise = (async () => {
    const host = process.env.SMTP_HOST
    if (host) {
      // A configured mail server (production, or your own dev SMTP).
      return nodemailer.createTransport({
        host,
        port: Number(process.env.SMTP_PORT ?? 587),
        secure: process.env.SMTP_SECURE === 'true', // true only for port 465
        auth: process.env.SMTP_USER
          ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
          : undefined,
      })
    }

    // No SMTP configured — spin up an Ethereal test inbox so dev still sends
    // a real email that you can preview.
    const testAccount = await nodemailer.createTestAccount()
    usingEthereal = true
    console.log(
      `\n[email] No SMTP_HOST set — using an Ethereal test inbox (login: ${testAccount.user}).`,
    )
    return nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: { user: testAccount.user, pass: testAccount.pass },
    })
  })()

  return transporterPromise
}

// Who the email appears to come from. Override with EMAIL_FROM in production.
const FROM = process.env.EMAIL_FROM ?? 'SWSWBS <no-reply@swswbs.local>'

// Send the verification email. It carries BOTH a 6-digit code (type it on the
// verification page) and a one-click link — the user can use whichever they
// prefer. Returns an Ethereal preview URL in dev, or null with a real server.
export async function sendVerificationEmail(
  to: string,
  verifyUrl: string,
  code: string,
): Promise<string | null> {
  const transporter = await getTransporter()
  const info = await transporter.sendMail({
    from: FROM,
    to,
    subject: 'Confirm your email — South Wales Social Well-being Scale',
    text:
      `Welcome to the SWSWBS survey.\n\n` +
      `Enter this 6-digit code on the verification page:\n\n    ${code}\n\n` +
      `Or confirm your email in one click with this link:\n${verifyUrl}\n\n` +
      `The code and link expire in 24 hours. If you didn't create an account, you can ignore this email.`,
    html: verificationHtml(verifyUrl, code),
  })
  return usingEthereal ? nodemailer.getTestMessageUrl(info) || null : null
}

// Send the password-reset email. Returns an Ethereal preview URL in dev.
export async function sendPasswordResetEmail(
  to: string,
  resetUrl: string,
): Promise<string | null> {
  const transporter = await getTransporter()
  const info = await transporter.sendMail({
    from: FROM,
    to,
    subject: 'Reset your password — South Wales Social Well-being Scale',
    text:
      `We received a request to reset your SWSWBS password.\n\n` +
      `Set a new password here:\n${resetUrl}\n\n` +
      `This link expires in 1 hour. If you didn't request this, you can safely ignore this email — your password won't change.`,
    html: resetHtml(resetUrl),
  })
  return usingEthereal ? nodemailer.getTestMessageUrl(info) || null : null
}

// The reset email body.
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

// Confirm to the person that their data-deletion request has been completed.
export async function sendDataDeletionEmail(to: string): Promise<string | null> {
  const transporter = await getTransporter()
  const info = await transporter.sendMail({
    from: FROM,
    to,
    subject: 'Your data has been deleted — South Wales Social Well-being Scale',
    text:
      `Your request to delete your data has been completed.\n\n` +
      `Your personal details and account have been removed. Any survey responses you gave are kept for ` +
      `research but have been anonymised so they no longer identify you.\n\n` +
      `You're welcome to sign up again at any time if you'd like to take part in future.`,
    html: deletionHtml(),
  })
  return usingEthereal ? nodemailer.getTestMessageUrl(info) || null : null
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

// The verification email body — shows the code prominently, with the one-click
// button underneath. Styles are inline because email clients strip <style>.
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
