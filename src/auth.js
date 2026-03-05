/**
 * Auth: session, auth block, hamburger menu, auth modal, sign in/out, create account, password recovery.
 */

import { supabase } from './supabase.js'
import { COPY, SIGN_OUT_TIMEOUT_MS } from './config.js'
import { dom } from './dom.js'
import { escapeHtml } from './utils.js'

let authModalMode = 'signin'

function getAuthEl() {
  return dom.auth
}

function getHamburgerEl() {
  return dom.hamburger
}

function closeHamburgerMenu() {
  const { menu, btn } = getHamburgerEl()
  if (!menu || !btn) return
  menu.classList.remove('hamburger-menu--open')
  menu.setAttribute('aria-hidden', 'true')
  btn.setAttribute('aria-expanded', 'false')
}

export function openAuthModal(mode) {
  closeHamburgerMenu()
  authModalMode = mode
  const { modal } = COPY
  const titles = modal.titles
  const submitLabels = modal.submitLabels
  const a = getAuthEl()
  a.modalTitle.textContent = titles[mode] ?? modal.defaultTitle
  a.submit.textContent = submitLabels[mode] ?? modal.defaultSubmit
  a.modalMessage.textContent = ''
  a.email.value = ''
  a.password.value = ''
  a.password.type = 'password'
  const toggle = a.passwordToggle
  if (toggle) {
    const iconShow = toggle.querySelector('.auth-form__password-icon--show')
    const iconHide = toggle.querySelector('.auth-form__password-icon--hide')
    if (iconShow) iconShow.hidden = false
    if (iconHide) iconHide.hidden = true
    toggle.setAttribute('aria-label', 'Show password')
  }
  if (a.newPassword) a.newPassword.value = ''
  if (a.passwordConfirm) a.passwordConfirm.value = ''
  a.password.required = mode === 'signin'
  a.email.required = mode !== 'set-password'

  if (a.formEmailRow) a.formEmailRow.hidden = mode === 'set-password'
  if (a.formPasswordRow) a.formPasswordRow.hidden = mode === 'recover' || mode === 'set-password'
  if (a.formRecover) a.formRecover.hidden = mode !== 'signin'
  if (a.formBack) a.formBack.hidden = mode !== 'recover' && mode !== 'set-password'
  if (a.formSetPassword) a.formSetPassword.hidden = mode !== 'set-password'

  a.modal.hidden = false
  a.modal.setAttribute('aria-hidden', 'false')
  a.modalBackdrop.hidden = false
  a.modalBackdrop.setAttribute('aria-hidden', 'false')
  if (mode === 'set-password' && a.newPassword) a.newPassword.focus()
  else a.email.focus()
}

export function closeAuthModal() {
  const a = getAuthEl()
  if (a.modal.contains(document.activeElement)) {
    const focusTarget = a.block?.querySelector('button, [href], input')
    if (focusTarget) focusTarget.focus()
    else document.body.focus()
  }
  a.modal.hidden = true
  a.modal.setAttribute('aria-hidden', 'true')
  a.modalBackdrop.hidden = true
  a.modalBackdrop.setAttribute('aria-hidden', 'true')
}

function setAuthMessage(text, type) {
  const a = getAuthEl()
  if (!a.modalMessage) return
  a.modalMessage.textContent = text
  if (text) {
    a.modalMessage.removeAttribute('hidden')
    a.modalMessage.setAttribute('aria-hidden', 'false')
    if (type === 'error' || type === 'success' || type === 'info') {
      a.modalMessage.setAttribute('data-message-type', type)
    } else {
      a.modalMessage.removeAttribute('data-message-type')
    }
    a.modalMessage.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  } else {
    a.modalMessage.setAttribute('aria-hidden', 'true')
    a.modalMessage.removeAttribute('data-message-type')
  }
}

export function isAnonymous(user) {
  return user?.is_anonymous === true
}

export async function ensureSession() {
  if (!supabase) return null
  const { data: { session } } = await supabase.auth.getSession()
  if (session?.user) return session.user
  const { data: { user }, error } = await supabase.auth.signInAnonymously()
  if (error) {
    console.error('Failed to sign in anonymously:', error)
    return null
  }
  return user
}

export async function getCurrentUser() {
  if (!supabase) return null
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

function updateHamburgerMenu(user) {
  const content = getHamburgerEl().content
  if (!content) return
  if (!user) {
    content.innerHTML = ''
    return
  }
  const ab = COPY.authBlock
  if (isAnonymous(user) && user.email) {
    content.innerHTML = `
      <span class="auth-block__guest-text">${escapeHtml(ab.verificationSent(user.email))}</span>
      <div class="auth-block__buttons">
        <button type="button" class="auth-block__btn" data-auth-action="signin">${escapeHtml(ab.signIn)}</button>
      </div>
    `
  } else if (isAnonymous(user)) {
    content.innerHTML = `
      <span class="auth-block__guest-text">${escapeHtml(ab.guestLabel)}</span>
      <div class="auth-block__buttons">
        <button type="button" class="auth-block__btn auth-block__btn--primary" data-auth-action="create">${escapeHtml(ab.createAccount)}</button>
        <button type="button" class="auth-block__btn" data-auth-action="signin">${escapeHtml(ab.signIn)}</button>
      </div>
    `
  } else {
    const emailLabel = user.email ? ab.signedInAs(user.email) : ab.signedInFallback
    content.innerHTML = `
      <span class="auth-block__signed-in">
        <span class="auth-block__email">${escapeHtml(emailLabel)}</span>
        <button type="button" class="auth-block__btn" data-auth-action="signout">${escapeHtml(ab.signOut)}</button>
      </span>
    `
  }
}

export function updateAuthBlock(user, callbacks) {
  const block = getAuthEl().block
  if (!block) return
  if (!user) {
    block.innerHTML = ''
    return
  }
  const ab = COPY.authBlock
  if (isAnonymous(user) && user.email) {
    block.innerHTML = `
      <span class="auth-block__guest-text">${escapeHtml(ab.verificationSent(user.email))}</span>
      <div class="auth-block__buttons">
        <button type="button" class="auth-block__btn" data-auth-action="signin">${escapeHtml(ab.signIn)}</button>
      </div>
    `
  } else if (isAnonymous(user)) {
    block.innerHTML = `
      <span class="auth-block__guest-text">${escapeHtml(ab.guestLabel)}</span>
      <div class="auth-block__buttons">
        <button type="button" class="auth-block__btn auth-block__btn--primary" data-auth-action="create">${escapeHtml(ab.createAccount)}</button>
        <button type="button" class="auth-block__btn" data-auth-action="signin">${escapeHtml(ab.signIn)}</button>
      </div>
    `
  } else {
    const emailLabel = user.email ? ab.signedInAs(user.email) : ab.signedInFallback
    block.innerHTML = `
      <span class="auth-block__signed-in">
        <span class="auth-block__email">${escapeHtml(emailLabel)}</span>
        <button type="button" class="auth-block__btn" data-auth-action="signout">${escapeHtml(ab.signOut)}</button>
      </span>
    `
  }
  updateHamburgerMenu(user)
}

async function handleSignOut(callbacks) {
  const { onLoadAndRenderTodos } = callbacks
  updateAuthBlock({ is_anonymous: true }, callbacks)
  if (callbacks.onClearTodos) callbacks.onClearTodos()
  ;(async () => {
    try {
      await Promise.race([
        supabase.auth.signOut(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('signOut timeout')), SIGN_OUT_TIMEOUT_MS))
      ])
    } catch (e) {
      if (e?.name !== 'AbortError' && e?.message !== 'signOut timeout') throw e
    }
    await new Promise((resolve) => { setTimeout(() => ensureSession().then(resolve), 0) })
    const user = await getCurrentUser()
    if (onLoadAndRenderTodos) await onLoadAndRenderTodos()
    updateAuthBlock(user, callbacks)
  })()
}

async function handleCreateAccount(email, password, callbacks) {
  // #region agent log
  fetch('http://127.0.0.1:7797/ingest/fbf92ecf-0d05-4380-b520-3386957e7bcb',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'a4347f'},body:JSON.stringify({sessionId:'a4347f',location:'auth.js:handleCreateAccount:entry',message:'Create account started',data:{hasEmail:!!email,emailLen:typeof email==='string'?email.length:0,hasPassword:!!password,passwordLen:password?password.length:0},timestamp:Date.now(),hypothesisId:'C'})}).catch(()=>{});
  // #endregion
  const msg = COPY.messages
  const emailTrimmed = typeof email === 'string' ? email.trim() : ''
  if (!emailTrimmed) {
    setAuthMessage(msg.enterEmail, 'error')
    return
  }
  const { data, error } = await supabase.auth.updateUser({ email: emailTrimmed })
  // #region agent log
  fetch('http://127.0.0.1:7797/ingest/fbf92ecf-0d05-4380-b520-3386957e7bcb',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'a4347f'},body:JSON.stringify({sessionId:'a4347f',location:'auth.js:updateUser-email:after',message:'updateUser email result',data:{hasError:!!error,errorCode:error?.code,errorMsg:error?.message?.slice(0,80),hasData:!!data},timestamp:Date.now(),hypothesisId:'B'})}).catch(()=>{});
  // #endregion
  if (error) {
    if (error.code === 'over_email_send_rate_limit' || error.status === 429 || error.message?.toLowerCase().includes('too many') || error.message?.toLowerCase().includes('rate limit')) {
      setAuthMessage(error.code === 'over_email_send_rate_limit' ? msg.emailRateLimit : msg.rateLimit, 'error')
      return
    }
    if (error.message?.toLowerCase().includes('already') || error.code === 'user_already_exists') {
      setAuthMessage(msg.emailAlreadyRegistered, 'error')
      authModalMode = 'signin'
  getAuthEl().modalTitle.textContent = COPY.modal.titles.signin
  getAuthEl().submit.textContent = COPY.modal.submitLabels.signin
  getAuthEl().password.required = true
      return
    }
    if (error.code === 'email_address_invalid' || error.message?.includes('invalid')) {
      setAuthMessage(msg.invalidEmailFormat, 'error')
      return
    }
    if (error.code === 'email_address_not_authorized') {
      setAuthMessage(msg.emailNotAuthorized, 'error')
      return
    }
    if (error.code === 'signup_disabled' || error.code === 'email_provider_disabled') {
      setAuthMessage(msg.signupDisabled, 'error')
      return
    }
    setAuthMessage(error.message ?? msg.createAccountError, 'error')
    return
  }
  setAuthMessage(msg.checkEmailVerify, 'success')
  if (password && password.length >= 6) {
    // #region agent log
    fetch('http://127.0.0.1:7797/ingest/fbf92ecf-0d05-4380-b520-3386957e7bcb',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'a4347f'},body:JSON.stringify({sessionId:'a4347f',location:'auth.js:before-updateUser-password',message:'About to updateUser password',data:{passwordLen:password?.length},timestamp:Date.now(),hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    const { error: pwError } = await supabase.auth.updateUser({ password })
    if (pwError) {
      // #region agent log
      fetch('http://127.0.0.1:7797/ingest/fbf92ecf-0d05-4380-b520-3386957e7bcb',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'a4347f'},body:JSON.stringify({sessionId:'a4347f',location:'auth.js:updateUser-password-error',message:'Password update failed, closing modal anyway',data:{pwErrorCode:pwError?.code,pwErrorMsg:pwError?.message?.slice(0,100)},timestamp:Date.now(),hypothesisId:'A',runId:'post-fix'})}).catch(()=>{});
      // #endregion
      if (pwError.status === 429 || pwError.message?.toLowerCase().includes('too many') || pwError.message?.toLowerCase().includes('rate limit')) {
        setAuthMessage(msg.rateLimit, 'error')
        return
      }
      setAuthMessage(msg.checkEmailSetPassword, 'info')
      /* Email succeeded; password cannot be set until email is verified. Still close modal and update UI. */
    }
  }
  // #region agent log
  fetch('http://127.0.0.1:7797/ingest/fbf92ecf-0d05-4380-b520-3386957e7bcb',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'a4347f'},body:JSON.stringify({sessionId:'a4347f',location:'auth.js:before-closeAuthModal',message:'About to close modal and update UI',data:{},timestamp:Date.now(),hypothesisId:'A,D'})}).catch(()=>{});
  // #endregion
  closeAuthModal()
  if (callbacks.onDismissOnboarding) callbacks.onDismissOnboarding()
  if (callbacks.onLoadAndRenderTodos) await callbacks.onLoadAndRenderTodos()
  updateAuthBlock(data?.user ?? (await getCurrentUser()), callbacks)
}

async function handleSignIn(email, password, anonymousUserId, callbacks) {
  const msg = COPY.messages
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) {
    if (error.status === 429 || error.message?.toLowerCase().includes('too many') || error.message?.toLowerCase().includes('rate limit')) {
      setAuthMessage(msg.rateLimit, 'error')
      return
    }
    let messageKey = null
    if (error.code === 'invalid_credentials') {
      messageKey = 'invalidCredentials'
    } else if (error.code === 'email_not_confirmed') {
      messageKey = 'emailNotConfirmed'
    } else if (error.code === 'user_banned') {
      messageKey = 'userBanned'
    } else if (!error.code) {
      const m = error.message?.toLowerCase() ?? ''
      if (m.includes('invalid') && (m.includes('login') || m.includes('credential'))) messageKey = 'invalidCredentials'
      else if (m.includes('email') && m.includes('confirm')) messageKey = 'emailNotConfirmed'
    }
    const text = messageKey ? msg[messageKey] : (error.message ?? msg.signInError)
    setAuthMessage(text, 'error')
    return
  }
  if (anonymousUserId) {
    const { error: rpcError } = await supabase.rpc('migrate_anonymous_todos', { from_user_id: anonymousUserId })
    if (rpcError) console.error('Failed to migrate anonymous todos:', rpcError)
  }
  closeAuthModal()
  if (callbacks.onDismissOnboarding) callbacks.onDismissOnboarding()
  if (callbacks.showToast) callbacks.showToast(COPY.toast.signedIn)
  if (callbacks.onLoadAndRenderTodos) await callbacks.onLoadAndRenderTodos()
  updateAuthBlock(data?.user ?? (await getCurrentUser()), callbacks)
}

async function handleRecoverPassword(email) {
  const msg = COPY.messages
  if (!supabase) return
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin + '/'
  })
  if (error) {
    if (error.status === 429 || error.message?.toLowerCase().includes('too many') || error.message?.toLowerCase().includes('rate limit')) {
      setAuthMessage(msg.rateLimit, 'error')
    } else {
      setAuthMessage(error.message ?? msg.sendResetError, 'error')
    }
    return
  }
  setAuthMessage(msg.checkEmailReset, 'success')
}

async function handleSetNewPassword(password, callbacks) {
  const msg = COPY.messages
  if (!supabase) return
  const { error } = await supabase.auth.updateUser({ password })
  if (error) {
    if (error.status === 429 || error.message?.toLowerCase().includes('too many') || error.message?.toLowerCase().includes('rate limit')) {
      setAuthMessage(msg.rateLimit, 'error')
    } else {
      setAuthMessage(error.message ?? msg.updatePasswordError, 'error')
    }
    return
  }
  closeAuthModal()
  if (callbacks.showToast) callbacks.showToast(msg.passwordUpdated)
  if (callbacks.onLoadAndRenderTodos) await callbacks.onLoadAndRenderTodos()
  updateAuthBlock(await getCurrentUser(), callbacks)
}

function onAuthBlockClick(e, callbacks) {
  const btn = e.target.closest('button[data-auth-action]')
  if (!btn || !getAuthEl().block.contains(btn)) return
  const action = btn.dataset.authAction
  if (action === 'signout') {
    e.preventDefault()
    e.stopPropagation()
    handleSignOut(callbacks)
  } else {
    openAuthModal(action)
  }
}

function onHamburgerMenuClick(e, callbacks) {
  const btn = e.target.closest('button[data-auth-action]')
  if (!btn || !getHamburgerEl().content?.contains(btn)) return
  const action = btn.dataset.authAction
  closeHamburgerMenu()
  if (action === 'signout') {
    e.preventDefault()
    e.stopPropagation()
    handleSignOut(callbacks)
  } else {
    openAuthModal(action)
  }
}

/**
 * Initialize auth: wire up event listeners.
 * @param {object} callbacks - { onLoadAndRenderTodos, onLoadCategories, onClearTodos, onDismissOnboarding, showToast }
 */
export function initAuth(callbacks = {}) {
  const a = getAuthEl()
  const h = getHamburgerEl()

  if (a.block) {
    a.block.addEventListener('click', (e) => onAuthBlockClick(e, callbacks), true)
  }

  if (h.btn) {
    h.btn.addEventListener('click', () => {
      if (h.menu?.classList.contains('hamburger-menu--open')) {
        closeHamburgerMenu()
      } else {
        h.menu.classList.add('hamburger-menu--open')
        h.menu.setAttribute('aria-hidden', 'false')
        h.btn.setAttribute('aria-expanded', 'true')
      }
    })
  }
  if (h.backdrop) h.backdrop.addEventListener('click', closeHamburgerMenu)
  if (h.content) h.content.addEventListener('click', (e) => onHamburgerMenuClick(e, callbacks), true)

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && h.menu?.classList.contains('hamburger-menu--open')) {
      closeHamburgerMenu()
    }
  })

  a.form?.addEventListener('submit', async (e) => {
    e.preventDefault?.()
    const msg = COPY.messages
    setAuthMessage('')
    if (!supabase) {
      setAuthMessage('Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.', 'error')
      return
    }
    try {
      const email = a.email.value.trim()
      const password = a.password.value
      if (authModalMode === 'recover') {
        if (!email) {
          setAuthMessage(msg.enterEmail, 'error')
          return
        }
        await handleRecoverPassword(email)
        return
      }
      if (authModalMode === 'set-password') {
        const newPassword = a.newPassword?.value ?? ''
        const confirm = a.passwordConfirm?.value ?? ''
        if (!newPassword) {
          setAuthMessage(msg.enterNewPassword, 'error')
          return
        }
        if (newPassword.length < 6) {
          setAuthMessage(msg.passwordTooShort, 'error')
          return
        }
        if (newPassword !== confirm) {
          setAuthMessage(msg.passwordsDontMatch, 'error')
          return
        }
        await handleSetNewPassword(newPassword, callbacks)
        return
      }
      if (!email) {
        setAuthMessage(msg.enterEmail, 'error')
        return
      }
      if (authModalMode === 'create') {
        // #region agent log
        fetch('http://127.0.0.1:7797/ingest/fbf92ecf-0d05-4380-b520-3386957e7bcb',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'a4347f'},body:JSON.stringify({sessionId:'a4347f',location:'auth.js:form-submit:create',message:'Form submit create path',data:{authModalMode,authModalModeExpected:'create'},timestamp:Date.now(),hypothesisId:'C'})}).catch(()=>{});
        // #endregion
        await handleCreateAccount(email, password, callbacks)
      } else {
        if (!password) {
          setAuthMessage(msg.enterPassword, 'error')
          return
        }
        const user = await getCurrentUser()
        const anonymousUserId = user && isAnonymous(user) ? user.id : null
        await handleSignIn(email, password, anonymousUserId, callbacks)
      }
    } catch (err) {
      setAuthMessage(err?.message ?? msg.somethingWentWrong, 'error')
    }
  })

  a.cancel?.addEventListener('click', closeAuthModal)
  a.modalBackdrop?.addEventListener('click', closeAuthModal)

  a.form?.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-auth-action]')
    if (!btn) return
    e.preventDefault()
    openAuthModal(btn.dataset.authAction)
  })

  const toggle = a.passwordToggle
  if (toggle) {
    const iconShow = toggle.querySelector('.auth-form__password-icon--show')
    const iconHide = toggle.querySelector('.auth-form__password-icon--hide')
    function syncPasswordIcons() {
      const isHidden = a.password.type === 'password'
      if (iconShow) iconShow.hidden = !isHidden
      if (iconHide) iconHide.hidden = isHidden
    }
    syncPasswordIcons()
    toggle.addEventListener('click', () => {
      if (a.password.type === 'password') {
        a.password.type = 'text'
        toggle.setAttribute('aria-label', 'Hide password')
      } else {
        a.password.type = 'password'
        toggle.setAttribute('aria-label', 'Show password')
      }
      syncPasswordIcons()
    })
  }
}
