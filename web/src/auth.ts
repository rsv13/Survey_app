// Small helpers for storing the login token in the browser.
// We keep the JWT in localStorage so a page refresh keeps you signed in.
// Every access is wrapped in try/catch because storage can be blocked
// (e.g. private-browsing mode) — in that case we just behave as logged out.

const TOKEN_KEY = 'swswbs-token'

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export function setToken(token: string): void {
  try {
    localStorage.setItem(TOKEN_KEY, token)
  } catch {
    // ignore — worst case the session only lasts until the next refresh
  }
}

export function clearToken(): void {
  try {
    localStorage.removeItem(TOKEN_KEY)
  } catch {
    // ignore
  }
}
