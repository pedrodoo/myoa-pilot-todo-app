/* ─────────────────────────────────────────────────────────────────────────────
   IMPORTS
   ───────────────────────────────────────────────────────────────────────────── */
import './style.css'
import { supabase } from './supabase.js'
import { renderTodoList, setTodosFromDb, updateTodo } from './todos.js'

/* ─────────────────────────────────────────────────────────────────────────────
   UI COPY & LABELS (designer-editable)
   All user-facing text in one place. Change here to update the interface.
   ───────────────────────────────────────────────────────────────────────────── */
const COPY = {
  // Header auth block (guest / signed-in states)
  authBlock: {
    guestLabel: 'Using as guest',
    verificationSent: (email) => `Verification email sent to ${email}. Check your inbox.`,
    signedInAs: (email) => `Signed in as ${email}`,
    signedInFallback: 'Signed in',
    createAccount: 'Create account',
    signIn: 'Sign in',
    signOut: 'Sign out',
  },
  // Auth modal (dialog title + submit button per mode)
  modal: {
    titles: {
      signin: 'Sign in',
      create: 'Create account',
      recover: 'Reset password',
      'set-password': 'Set new password',
    },
    submitLabels: {
      signin: 'Sign in',
      create: 'Create account',
      recover: 'Send reset link',
      'set-password': 'Set password',
    },
    defaultTitle: 'Sign in',
    defaultSubmit: 'Submit',
  },
  // Auth modal messages (validation + API errors)
  messages: {
    enterEmail: 'Enter your email address.',
    enterPassword: 'Enter your password.',
    enterNewPassword: 'Enter a new password.',
    passwordTooShort: 'Password must be at least 6 characters.',
    passwordsDontMatch: 'Passwords do not match.',
    rateLimit: 'Too many attempts. Please try again in a few minutes.',
    emailAlreadyRegistered: 'This email is already registered. Sign in instead.',
    createAccountError: 'Failed to create account.',
    signInError: 'Sign in failed.',
    checkEmailVerify: 'Check your email to verify. You can set a password after verifying.',
    checkEmailSetPassword: 'Check your email to verify, then you can set a password here.',
    checkEmailReset: 'Check your email for a link to reset your password.',
    passwordUpdated: 'Password updated',
    sendResetError: 'Failed to send reset email.',
    updatePasswordError: 'Failed to update password.',
  },
  // Toast (transient notifications)
  toast: {
    signedIn: 'Signed in successfully',
  },
  // Todo list
  deleteConfirm: 'Delete this item?',
  importance: 'Importance',
  dueDate: 'Due date',
  category: 'Category',
  edit: 'Edit',
  save: 'Save',
  cancel: 'Cancel',
  manageCategories: 'Manage categories',
  addCategory: 'Add category',
  sortBy: 'Sort by',
  order: 'Order',
  filter: 'Filter',
  filterAll: 'All',
  filterHighImportance: 'High importance',
  filterOverdue: 'Overdue',
  filterDueToday: 'Due today',
  filterNoDate: 'No date',
  filterByCategory: 'By category',
  sortCreated: 'Created',
  sortDueDate: 'Due date',
  sortImportance: 'Importance',
  sortCategory: 'Category',
  sortStatus: 'Status',
  orderAsc: 'Ascending',
  orderDesc: 'Descending',
  none: 'None',
}

// Timing (designer / UX tweaks)
const TOAST_DURATION_MS = 4000
const SIGN_OUT_TIMEOUT_MS = 3000

/* ─────────────────────────────────────────────────────────────────────────────
   DOM REFERENCES
   Grouped by screen area so you can see what belongs to which part of the UI.
   ───────────────────────────────────────────────────────────────────────────── */

// Auth: header block (guest state + “Signed in as …” + Sign out)
const authBlock = document.getElementById('auth-block')

// Auth: modal overlay and dialog
const authModal = document.getElementById('auth-modal')
const authModalBackdrop = document.getElementById('auth-modal-backdrop')
const authModalTitle = document.getElementById('auth-modal-title')
const authModalMessage = document.getElementById('auth-modal-message')
const authForm = document.getElementById('auth-form')
const authEmail = document.getElementById('auth-email')
const authPassword = document.getElementById('auth-password')
const authSubmit = document.getElementById('auth-submit')
const authCancel = document.getElementById('auth-cancel')
const authPasswordToggle = document.querySelector('.auth-form__password-toggle')
const authFormEmailRow = document.getElementById('auth-form-email-row')
const authFormPasswordRow = document.getElementById('auth-form-password-row')
const authFormRecover = document.getElementById('auth-form-recover')
const authFormBack = document.getElementById('auth-form-back')
const authFormSetPassword = document.getElementById('auth-form-set-password')
const authNewPassword = document.getElementById('auth-new-password')
const authPasswordConfirm = document.getElementById('auth-password-confirm')

// Todo: input form + list
const form = document.getElementById('todo-form')
const input = document.getElementById('todo-input')
const listEl = document.getElementById('todo-list')
// Add-todo modal (importance, due date, category when creating)
const addTodoModal = document.getElementById('add-todo-modal')
const addTodoModalBackdrop = document.getElementById('add-todo-modal-backdrop')
const addTodoModalText = document.getElementById('add-todo-modal-text')
const addTodoModalForm = document.getElementById('add-todo-modal-form')
const addTodoModalImportance = document.getElementById('add-todo-modal-importance')
const addTodoModalDueDate = document.getElementById('add-todo-modal-due-date')
const addTodoModalCategory = document.getElementById('add-todo-modal-category')
const addTodoModalCancel = document.getElementById('add-todo-modal-cancel')
const filterSortBy = document.getElementById('filter-sort-by')
const filterSortOrder = document.getElementById('filter-sort-order')
const filterType = document.getElementById('filter-type')
const filterCategory = document.getElementById('filter-category')
const manageCategoriesBtn = document.getElementById('manage-categories-btn')
const categoriesModal = document.getElementById('categories-modal')
const categoriesModalBackdrop = document.getElementById('categories-modal-backdrop')
const categoriesModalClose = document.getElementById('categories-modal-close')
const categoriesForm = document.getElementById('categories-form')
const categoryNameInput = document.getElementById('category-name')
const categoryColorInput = document.getElementById('category-color')
const categoriesListEl = document.getElementById('categories-list')

// Toast (floating message)
const toastEl = document.getElementById('toast')

/** Current auth modal mode. Determines title, submit label, and which form rows are visible. */
let authModalMode = 'signin'

/** Categories for current user (loaded from DB). */
let categories = []

/** Filter/sort state. */
let sortBy = 'created'
let sortOrder = 'asc'
let filterTypeVal = 'all'
let filterValue = null

/** Pending todo text when add-todo modal is open (user clicked Add with text, modal sets options). */
let pendingAddTodoText = null

/* ─────────────────────────────────────────────────────────────────────────────
   AUTH BLOCK (header)
   Renders: “Using as guest” + buttons, or “Signed in as …” + Sign out.
   ───────────────────────────────────────────────────────────────────────────── */
function escapeHtml(str) {
  const div = document.createElement('div')
  div.textContent = str
  return div.innerHTML
}

function updateAuthBlock(user) {
  if (!authBlock) return
  if (!user) {
    authBlock.innerHTML = ''
    return
  }
  const { authBlock: ab } = COPY
  if (isAnonymous(user) && user.email) {
    authBlock.innerHTML = `
      <span class="auth-block__guest-text">${escapeHtml(ab.verificationSent(user.email))}</span>
      <div class="auth-block__buttons">
        <button type="button" class="auth-block__btn" data-auth-action="signin">${escapeHtml(ab.signIn)}</button>
      </div>
    `
  } else if (isAnonymous(user)) {
    authBlock.innerHTML = `
      <span class="auth-block__guest-text">${escapeHtml(ab.guestLabel)}</span>
      <div class="auth-block__buttons">
        <button type="button" class="auth-block__btn auth-block__btn--primary" data-auth-action="create">${escapeHtml(ab.createAccount)}</button>
        <button type="button" class="auth-block__btn" data-auth-action="signin">${escapeHtml(ab.signIn)}</button>
      </div>
    `
  } else {
    const emailLabel = user.email ? ab.signedInAs(user.email) : ab.signedInFallback
    authBlock.innerHTML = `
      <span class="auth-block__signed-in">
        <span class="auth-block__email">${escapeHtml(emailLabel)}</span>
        <button type="button" class="auth-block__btn" data-auth-action="signout">${escapeHtml(ab.signOut)}</button>
      </span>
    `
  }
}

function onAuthBlockClick(e) {
  const btn = e.target.closest('button[data-auth-action]')
  if (!btn || !authBlock.contains(btn)) return
  const action = btn.dataset.authAction
  if (action === 'signout') {
    e.preventDefault()
    e.stopPropagation()
    handleSignOut()
  } else {
    openAuthModal(action)
  }
}
if (authBlock) authBlock.addEventListener('click', onAuthBlockClick, true)

/* ─────────────────────────────────────────────────────────────────────────────
   AUTH MODAL (dialog)
   Open/close, per-mode title + submit label, form row visibility, messages.
   ───────────────────────────────────────────────────────────────────────────── */
function openAuthModal(mode) {
  authModalMode = mode
  const { modal } = COPY
  const titles = modal.titles
  const submitLabels = modal.submitLabels
  authModalTitle.textContent = titles[mode] ?? modal.defaultTitle
  authSubmit.textContent = submitLabels[mode] ?? modal.defaultSubmit
  authModalMessage.textContent = ''
  authEmail.value = ''
  authPassword.value = ''
  authPassword.type = 'password'
  if (authPasswordToggle) {
    const iconShow = authPasswordToggle.querySelector('.auth-form__password-icon--show')
    const iconHide = authPasswordToggle.querySelector('.auth-form__password-icon--hide')
    if (iconShow) iconShow.hidden = false
    if (iconHide) iconHide.hidden = true
    authPasswordToggle.setAttribute('aria-label', 'Show password')
  }
  if (authNewPassword) authNewPassword.value = ''
  if (authPasswordConfirm) authPasswordConfirm.value = ''
  authPassword.required = mode === 'signin'
  authEmail.required = mode !== 'set-password'

  if (authFormEmailRow) authFormEmailRow.hidden = mode === 'set-password'
  if (authFormPasswordRow) authFormPasswordRow.hidden = mode === 'recover' || mode === 'set-password'
  if (authFormRecover) authFormRecover.hidden = mode !== 'signin'
  if (authFormBack) authFormBack.hidden = mode !== 'recover' && mode !== 'set-password'
  if (authFormSetPassword) authFormSetPassword.hidden = mode !== 'set-password'

  authModal.hidden = false
  authModal.setAttribute('aria-hidden', 'false')
  authModalBackdrop.hidden = false
  authModalBackdrop.setAttribute('aria-hidden', 'false')
  if (mode === 'set-password' && authNewPassword) authNewPassword.focus()
  else authEmail.focus()
}

function closeAuthModal() {
  if (authModal.contains(document.activeElement)) {
    const focusTarget = authBlock?.querySelector('button, [href], input')
    if (focusTarget) focusTarget.focus()
    else document.body.focus()
  }
  authModal.hidden = true
  authModal.setAttribute('aria-hidden', 'true')
  authModalBackdrop.hidden = true
  authModalBackdrop.setAttribute('aria-hidden', 'true')
}

function setAuthMessage(text) {
  if (authModalMessage) authModalMessage.textContent = text
}

/* ─────────────────────────────────────────────────────────────────────────────
   TOAST
   Short-lived message (e.g. “Signed in successfully”). Duration in COPY/timing.
   ───────────────────────────────────────────────────────────────────────────── */
let toastHideTimeout = null
function showToast(message) {
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

/* ─────────────────────────────────────────────────────────────────────────────
   AUTH ACTIONS (sign in, create account, sign out, recover password, set password)
   These call Supabase and then update the UI (auth block, modal message, toast).
   ───────────────────────────────────────────────────────────────────────────── */
async function ensureSession() {
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

async function getCurrentUser() {
  if (!supabase) return null
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

function isAnonymous(user) {
  return user?.is_anonymous === true
}

function handleSignOut() {
  if (!supabase) return
  updateAuthBlock({ is_anonymous: true })
  setTodosFromDb([])
  categories = []
  renderTodoList(listEl, { categories: [] })
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
    await loadAndRenderTodos()
    updateAuthBlock(user)
  })()
}

async function handleCreateAccount(email, password) {
  const msg = COPY.messages
  const { data, error } = await supabase.auth.updateUser({ email })
  if (error) {
    if (error.status === 429 || error.message?.toLowerCase().includes('too many') || error.message?.toLowerCase().includes('rate limit')) {
      setAuthMessage(msg.rateLimit)
      return
    }
    if (error.message?.toLowerCase().includes('already') || error.code === 'user_already_exists') {
      setAuthMessage(msg.emailAlreadyRegistered)
      authModalMode = 'signin'
      authModalTitle.textContent = COPY.modal.titles.signin
      authSubmit.textContent = COPY.modal.submitLabels.signin
      authPassword.required = true
      return
    }
    setAuthMessage(error.message ?? msg.createAccountError)
    return
  }
  setAuthMessage(msg.checkEmailVerify)
  if (password && password.length >= 6) {
    const { error: pwError } = await supabase.auth.updateUser({ password })
    if (pwError) {
      if (pwError.status === 429 || pwError.message?.toLowerCase().includes('too many') || pwError.message?.toLowerCase().includes('rate limit')) {
        setAuthMessage(msg.rateLimit)
      } else {
        setAuthMessage(msg.checkEmailSetPassword)
      }
      return
    }
  }
  closeAuthModal()
  await loadAndRenderTodos()
  updateAuthBlock(data?.user ?? (await getCurrentUser()))
}

async function handleSignIn(email, password, anonymousUserId) {
  const msg = COPY.messages
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) {
    if (error.status === 429 || error.message?.toLowerCase().includes('too many') || error.message?.toLowerCase().includes('rate limit')) {
      setAuthMessage(msg.rateLimit)
    } else {
      setAuthMessage(error.message ?? msg.signInError)
    }
    return
  }
  if (anonymousUserId) {
    const { error: rpcError } = await supabase.rpc('migrate_anonymous_todos', { from_user_id: anonymousUserId })
    if (rpcError) console.error('Failed to migrate anonymous todos:', rpcError)
  }
  closeAuthModal()
  showToast(COPY.toast.signedIn)
  await loadAndRenderTodos()
  updateAuthBlock(data?.user ?? (await getCurrentUser()))
}

async function handleRecoverPassword(email) {
  const msg = COPY.messages
  if (!supabase) return
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin + '/'
  })
  if (error) {
    if (error.status === 429 || error.message?.toLowerCase().includes('too many') || error.message?.toLowerCase().includes('rate limit')) {
      setAuthMessage(msg.rateLimit)
    } else {
      setAuthMessage(error.message ?? msg.sendResetError)
    }
    return
  }
  setAuthMessage(msg.checkEmailReset)
}

async function handleSetNewPassword(password) {
  const msg = COPY.messages
  if (!supabase) return
  const { error } = await supabase.auth.updateUser({ password })
  if (error) {
    if (error.status === 429 || error.message?.toLowerCase().includes('too many') || error.message?.toLowerCase().includes('rate limit')) {
      setAuthMessage(msg.rateLimit)
    } else {
      setAuthMessage(error.message ?? msg.updatePasswordError)
    }
    return
  }
  closeAuthModal()
  showToast(msg.passwordUpdated)
  await loadAndRenderTodos()
  updateAuthBlock(await getCurrentUser())
}

/* ─────────────────────────────────────────────────────────────────────────────
   AUTH FORM (modal) – submit + secondary actions
   Submit runs create / sign in / recover / set-password based on authModalMode.
   ───────────────────────────────────────────────────────────────────────────── */
authForm.addEventListener('submit', async (e) => {
  e.preventDefault?.()
  const msg = COPY.messages
  setAuthMessage('')
  if (!supabase) {
    setAuthMessage('Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.')
    return
  }
  try {
    const email = authEmail.value.trim()
    const password = authPassword.value
    if (authModalMode === 'recover') {
      if (!email) {
        setAuthMessage(msg.enterEmail)
        return
      }
      await handleRecoverPassword(email)
      return
    }
    if (authModalMode === 'set-password') {
      const newPassword = authNewPassword?.value ?? ''
      const confirm = authPasswordConfirm?.value ?? ''
      if (!newPassword) {
        setAuthMessage(msg.enterNewPassword)
        return
      }
      if (newPassword.length < 6) {
        setAuthMessage(msg.passwordTooShort)
        return
      }
      if (newPassword !== confirm) {
        setAuthMessage(msg.passwordsDontMatch)
        return
      }
      await handleSetNewPassword(newPassword)
      return
    }
    if (!email) return
    if (authModalMode === 'create') {
      await handleCreateAccount(email, password)
    } else {
      if (!password) {
        setAuthMessage(msg.enterPassword)
        return
      }
      const user = await getCurrentUser()
      const anonymousUserId = user && isAnonymous(user) ? user.id : null
      await handleSignIn(email, password, anonymousUserId)
    }
  } catch (err) {
    setAuthMessage(err?.message ?? msg.signInError)
  }
})

authCancel.addEventListener('click', closeAuthModal)
authModalBackdrop.addEventListener('click', closeAuthModal)

authForm.addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-auth-action]')
  if (!btn) return
  e.preventDefault()
  openAuthModal(btn.dataset.authAction)
})

if (authPasswordToggle) {
  const iconShow = authPasswordToggle.querySelector('.auth-form__password-icon--show')
  const iconHide = authPasswordToggle.querySelector('.auth-form__password-icon--hide')
  function syncPasswordIcons() {
    const isHidden = authPassword.type === 'password'
    if (iconShow) iconShow.hidden = !isHidden
    if (iconHide) iconHide.hidden = isHidden
  }
  syncPasswordIcons()
  authPasswordToggle.addEventListener('click', () => {
    if (authPassword.type === 'password') {
      authPassword.type = 'text'
      authPasswordToggle.setAttribute('aria-label', 'Hide password')
    } else {
      authPassword.type = 'password'
      authPasswordToggle.setAttribute('aria-label', 'Show password')
    }
    syncPasswordIcons()
  })
}

/* ─────────────────────────────────────────────────────────────────────────────
   CATEGORIES
   Load categories for current user and populate dropdowns.
   ───────────────────────────────────────────────────────────────────────────── */
async function loadCategories() {
  const user = await getCurrentUser()
  if (!user || !supabase) return
  const { data, error } = await supabase
    .from('categories')
    .select('name, color')
    .eq('user_id', user.id)
    .order('name', { ascending: true })
  if (error) {
    console.error('Failed to load categories:', error)
    return
  }
  categories = (data ?? []).map((r) => ({ name: r.name, color: r.color || '#888' }))
  populateCategoryDropdowns()
}

function populateCategoryDropdowns() {
  const options = categories.map((c) => `<option value="${escapeHtml(c.name)}">${escapeHtml(c.name)}</option>`).join('')
  if (addTodoModalCategory) {
    const current = addTodoModalCategory.value
    addTodoModalCategory.innerHTML = '<option value="">None</option>' + options
    if (categories.some((c) => c.name === current)) addTodoModalCategory.value = current
  }
  if (filterCategory) {
    const current = filterCategory.value
    filterCategory.innerHTML = '<option value="">Select category</option>' + options
    if (categories.some((c) => c.name === current)) filterCategory.value = current
  }
}

/* ─────────────────────────────────────────────────────────────────────────────
   TODO LIST
   Add todo (form submit), toggle complete (checkbox), delete (button), load + render.
   ───────────────────────────────────────────────────────────────────────────── */
function getFilterValue() {
  if (filterTypeVal === 'importance') return 'high'
  if (filterTypeVal === 'category' && filterCategory) return filterCategory.value || null
  return null
}

async function loadAndRenderTodos(animateId) {
  const user = await getCurrentUser()
  if (!user) return
  const { data, error } = await supabase
    .from('todos')
    .select('id, text, is_complete, created_at, importance, due_date, category')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
  if (error) {
    console.error('Failed to load todos:', error)
    return
  }
  if (typeof setTodosFromDb !== 'function' || typeof renderTodoList !== 'function') {
    console.error('setTodosFromDb or renderTodoList missing')
    return
  }
  setTodosFromDb(data ?? [])
  const filterVal = getFilterValue()
  renderTodoList(listEl, {
    sortBy,
    sortOrder,
    filterType: filterTypeVal,
    filterValue: filterVal,
    categories,
    animateId: animateId || undefined,
  })
}

function applyFilterSortAndRender() {
  const filterVal = getFilterValue()
  renderTodoList(listEl, {
    sortBy,
    sortOrder,
    filterType: filterTypeVal,
    filterValue: filterVal,
    categories,
  })
}

form.addEventListener('submit', (e) => {
  e.preventDefault?.()
  const text = input.value.trim()
  if (!text) return
  if (!supabase) {
    console.error('Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env to valid values.')
    return
  }
  pendingAddTodoText = text
  input.value = ''
  openAddTodoModal()
})

function openAddTodoModal() {
  if (!addTodoModal || !addTodoModalBackdrop) return
  populateCategoryDropdowns()
  if (addTodoModalText) addTodoModalText.textContent = pendingAddTodoText ? `Add todo: "${pendingAddTodoText}"` : ''
  if (addTodoModalImportance) addTodoModalImportance.value = ''
  if (addTodoModalDueDate) addTodoModalDueDate.value = ''
  if (addTodoModalCategory) addTodoModalCategory.value = ''
  addTodoModal.hidden = false
  addTodoModal.setAttribute('aria-hidden', 'false')
  addTodoModalBackdrop.hidden = false
  addTodoModalBackdrop.setAttribute('aria-hidden', 'false')
  if (addTodoModalImportance) addTodoModalImportance.focus()
}

function closeAddTodoModal() {
  if (!addTodoModal || !addTodoModalBackdrop) return
  addTodoModal.hidden = true
  addTodoModal.setAttribute('aria-hidden', 'true')
  addTodoModalBackdrop.hidden = true
  addTodoModalBackdrop.setAttribute('aria-hidden', 'true')
  pendingAddTodoText = null
  if (addTodoModalImportance) addTodoModalImportance.value = ''
  if (addTodoModalDueDate) addTodoModalDueDate.value = ''
  if (addTodoModalCategory) addTodoModalCategory.value = ''
}

if (addTodoModalForm) {
  addTodoModalForm.addEventListener('submit', async (e) => {
    e.preventDefault?.()
    if (!pendingAddTodoText || !supabase) return
    const user = await getCurrentUser()
    if (!user) {
      console.error('Not signed in. Cannot add todo.')
      return
    }
    const importance = addTodoModalImportance?.value?.trim() || null
    const dueDate = addTodoModalDueDate?.value?.trim() || null
    const category = addTodoModalCategory?.value?.trim() || null
    const { data, error } = await supabase
      .from('todos')
      .insert({ text: pendingAddTodoText, is_complete: false, user_id: user.id, importance, due_date: dueDate || null, category })
      .select('id')
      .single()
    if (error) {
      console.error('Failed to insert todo:', error)
      if (input) input.value = pendingAddTodoText
      closeAddTodoModal()
      return
    }
    closeAddTodoModal()
    await loadAndRenderTodos(data?.id)
    if (input) input.focus()
  })
}
if (addTodoModalCancel) addTodoModalCancel.addEventListener('click', () => {
  if (input) input.value = pendingAddTodoText ?? input.value
  closeAddTodoModal()
})
if (addTodoModalBackdrop) addTodoModalBackdrop.addEventListener('click', () => {
  if (input) input.value = pendingAddTodoText ?? input.value
  closeAddTodoModal()
})

listEl.addEventListener('change', async (e) => {
  if (!e.target.classList.contains('todo-item__checkbox')) return
  const li = e.target.closest('.todo-item')
  const id = li?.dataset.id
  if (!id || !supabase) return
  const user = await getCurrentUser()
  if (!user) return
  const isComplete = e.target.checked
  const { error } = await supabase
    .from('todos')
    .update({ is_complete: isComplete })
    .eq('id', id)
    .eq('user_id', user.id)
  if (error) {
    console.error('Failed to toggle todo:', error)
    e.target.checked = !isComplete
    return
  }
  await loadAndRenderTodos()
})

// Filter/sort: update state and re-render
if (filterSortBy) {
  filterSortBy.addEventListener('change', () => {
    sortBy = filterSortBy.value
    applyFilterSortAndRender()
  })
}
if (filterSortOrder) {
  filterSortOrder.addEventListener('change', () => {
    sortOrder = filterSortOrder.value
    applyFilterSortAndRender()
  })
}
if (filterType) {
  filterType.addEventListener('change', () => {
    filterTypeVal = filterType.value
    if (filterCategory) filterCategory.hidden = filterTypeVal !== 'category'
    applyFilterSortAndRender()
  })
}
if (filterCategory) {
  filterCategory.addEventListener('change', () => applyFilterSortAndRender())
}

listEl.addEventListener('click', async (e) => {
  const li = e.target.closest('.todo-item')
  if (!li) return
  const id = li?.dataset.id
  const action = e.target.closest('[data-action]')?.dataset?.action

  if (action === 'edit') {
    e.preventDefault()
    const view = li.querySelector('.todo-item__view')
    const editForm = li.querySelector('.todo-item__edit-form')
    if (view && editForm) {
      view.hidden = true
      editForm.hidden = false
    }
    return
  }

  if (action === 'edit-cancel') {
    e.preventDefault()
    const view = li.querySelector('.todo-item__view')
    const editForm = li.querySelector('.todo-item__edit-form')
    if (view && editForm) {
      view.hidden = false
      editForm.hidden = true
    }
    return
  }

  if (action === 'edit-save') {
    e.preventDefault()
    if (!id || !supabase) return
    const user = await getCurrentUser()
    if (!user) return
    const importanceEl = li.querySelector('.todo-item__edit-importance')
    const dueEl = li.querySelector('.todo-item__edit-due')
    const categoryEl = li.querySelector('.todo-item__edit-category')
    const importance = importanceEl?.value?.trim() || null
    const dueDate = dueEl?.value?.trim() || null
    const category = categoryEl?.value?.trim() || null
    const { error } = await supabase
      .from('todos')
      .update({ importance, due_date: dueDate || null, category })
      .eq('id', id)
      .eq('user_id', user.id)
    if (error) {
      console.error('Failed to update todo:', error)
      return
    }
    updateTodo(id, { importance, dueDate: dueDate || null, category })
    const view = li.querySelector('.todo-item__view')
    const editForm = li.querySelector('.todo-item__edit-form')
    if (view && editForm) {
      view.hidden = false
      editForm.hidden = true
    }
    applyFilterSortAndRender()
    return
  }

  const deleteBtn = e.target.closest('.todo-item__delete')
  if (!deleteBtn) return
  if (!id || !supabase) return
  const user = await getCurrentUser()
  if (!user) return
  if (!confirm(COPY.deleteConfirm)) return
  const { error } = await supabase
    .from('todos')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)
  if (error) {
    console.error('Failed to delete todo:', error)
    return
  }
  await loadAndRenderTodos()
})

/* ─────────────────────────────────────────────────────────────────────────────
   CATEGORIES MODAL
   Open/close, add category, list categories.
   ───────────────────────────────────────────────────────────────────────────── */
function openCategoriesModal() {
  if (!categoriesModal || !categoriesModalBackdrop) return
  renderCategoriesList()
  categoriesModal.hidden = false
  categoriesModal.setAttribute('aria-hidden', 'false')
  categoriesModalBackdrop.hidden = false
  categoriesModalBackdrop.setAttribute('aria-hidden', 'false')
  if (categoryNameInput) categoryNameInput.focus()
}

function closeCategoriesModal() {
  if (!categoriesModal || !categoriesModalBackdrop) return
  categoriesModal.hidden = true
  categoriesModal.setAttribute('aria-hidden', 'true')
  categoriesModalBackdrop.hidden = true
  categoriesModalBackdrop.setAttribute('aria-hidden', 'true')
}

function renderCategoriesList() {
  if (!categoriesListEl) return
  categoriesListEl.innerHTML = categories
    .map(
      (c) =>
        `<li class="categories-list__item"><span class="categories-list__swatch" style="background-color:${escapeHtml(c.color)}"></span>${escapeHtml(c.name)}</li>`
    )
    .join('')
}

if (manageCategoriesBtn) manageCategoriesBtn.addEventListener('click', openCategoriesModal)
if (categoriesModalClose) categoriesModalClose.addEventListener('click', closeCategoriesModal)
if (categoriesModalBackdrop) categoriesModalBackdrop.addEventListener('click', closeCategoriesModal)

if (categoriesForm) {
  categoriesForm.addEventListener('submit', async (e) => {
    e.preventDefault?.()
    const name = categoryNameInput?.value?.trim()
    if (!name || !supabase) return
    const user = await getCurrentUser()
    if (!user) return
    const color = categoryColorInput?.value || '#10b981'
    const { error } = await supabase.from('categories').insert({ user_id: user.id, name, color })
    if (error) {
      console.error('Failed to add category:', error)
      return
    }
    if (categoryNameInput) categoryNameInput.value = ''
    if (categoryColorInput) categoryColorInput.value = '#10b981'
    await loadCategories()
    renderCategoriesList()
    applyFilterSortAndRender()
  })
}

/* ─────────────────────────────────────────────────────────────────────────────
   APP BOOT
   Load session, show auth block + todo list, subscribe to auth state changes.
   ───────────────────────────────────────────────────────────────────────────── */
async function init() {
  if (!supabase) {
    console.error('Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.')
    return
  }
  const hash = window.location.hash
  const isRecovery = hash.includes('type=recovery')
  const user = await ensureSession()
  if (!user) {
    console.error('Could not establish a session.')
    return
  }
  if (isRecovery) {
    openAuthModal('set-password')
    window.history.replaceState(null, '', window.location.pathname + window.location.search)
  }
  await loadCategories()
  await loadAndRenderTodos()
  updateAuthBlock(user)

  supabase.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_IN') {
      const wasOpen = !authModal.hidden
      closeAuthModal()
      if (wasOpen) showToast(COPY.toast.signedIn)
    }
    let u
    if (event === 'SIGNED_OUT') {
      u = null
    } else {
      u = session?.user ?? (await getCurrentUser())
    }
    if (event === 'SIGNED_OUT') {
      u = await new Promise((resolve) => {
        setTimeout(() => ensureSession().then(resolve), 0)
      })
      updateAuthBlock(u)
      await loadCategories()
      await loadAndRenderTodos()
      return
    }
    updateAuthBlock(u)
    if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED') {
      await loadCategories()
      await loadAndRenderTodos()
    }
  })
}

init()
