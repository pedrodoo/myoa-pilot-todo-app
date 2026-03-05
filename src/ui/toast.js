/**
 * Toast notifications - short-lived floating messages.
 */

import { dom } from '../dom.js'
import { TOAST_DURATION_MS } from '../config.js'

let toastHideTimeout = null

export function showToast(message) {
  const toastEl = dom.toast
  if (!toastEl) return
  if (toastHideTimeout) {
    clearTimeout(toastHideTimeout)
    toastHideTimeout = null
  }
  toastEl.textContent = message
  toastEl.hidden = false
  toastEl.removeAttribute('aria-hidden')
  toastHideTimeout = setTimeout(() => {
    toastEl.hidden = true
    toastEl.setAttribute('aria-hidden', 'true')
    toastHideTimeout = null
  }, TOAST_DURATION_MS)
}
