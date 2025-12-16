/**
 * Redirect helpers.
 *
 * Keep these functions pure so they can be used in both client and server code.
 */

const DEFAULT_REDIRECT_PATH = '/dashboard'

/**
 * Returns true if the redirect path is a safe, same-site relative path.
 *
 * We intentionally disallow:
 * - absolute URLs (e.g. https://example.com)
 * - protocol-relative URLs (//example.com)
 * - weird Windows-ish paths (/\)
 *
 * This prevents open redirects (e.g. sending a user to `http://localhost:3000` in prod).
 */
export function isSafeRedirectPath(value: string): boolean {
  return (
    value.startsWith('/') &&
    !value.startsWith('//') &&
    !value.startsWith('/\\')
  )
}

/**
 * Normalizes a redirect path from an untrusted source (query string, cookie, etc).
 *
 * @param rawRedirectPath - Untrusted redirect path input.
 * @param fallback - Path to use when input is missing or unsafe.
 */
export function getSafeRedirectPath(
  rawRedirectPath: string | null | undefined,
  fallback: string = DEFAULT_REDIRECT_PATH
): string {
  if (!rawRedirectPath) return fallback
  if (!isSafeRedirectPath(rawRedirectPath)) return fallback
  return rawRedirectPath
}


