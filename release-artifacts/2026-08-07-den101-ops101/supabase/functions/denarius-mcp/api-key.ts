export const DENARIUS_API_KEY_PREFIX = 'dnr_live_'

export function parseDenariusApiKey(value: string | null): string | null {
  if (!value || !value.startsWith(DENARIUS_API_KEY_PREFIX)) return null
  return /^[0-9a-f]{48}$/.test(value.slice(DENARIUS_API_KEY_PREFIX.length)) ? value : null
}

export async function hashDenariusApiKey(secret: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(secret))
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('')
}
