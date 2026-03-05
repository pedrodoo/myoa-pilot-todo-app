/**
 * Shared utilities used across the app.
 */

/** Escapes a string so it can be safely used in innerHTML (avoids XSS). */
export function escapeHtml(str) {
  if (str == null) return ''
  const div = document.createElement('div')
  div.textContent = str
  return div.innerHTML
}
