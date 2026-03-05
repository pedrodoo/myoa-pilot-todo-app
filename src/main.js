/**
 * App entry point. Orchestrates auth, modals, todos, and onboarding.
 */

import './style.css'
import { supabase } from './supabase.js'
import { COPY } from './config.js'
import { ensureSession, getCurrentUser, updateAuthBlock, openAuthModal, closeAuthModal, initAuth } from './auth.js'
import { loadAndRenderTodos, loadCategories, clearTodosAndRender } from './data.js'
import { showToast } from './ui/toast.js'
import { dismissOnboarding, incrementOnboardingVisitCount, setupOnboardingListeners, showOnboardingIfNeeded } from './onboarding.js'
import { initModals } from './modals.js'
import { initTodoHandlers } from './todoHandlers.js'

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

  initAuth({
    onLoadAndRenderTodos: loadAndRenderTodos,
    onLoadCategories: loadCategories,
    onClearTodos: clearTodosAndRender,
    onDismissOnboarding: dismissOnboarding,
    showToast,
  })

  initModals()
  initTodoHandlers()

  await loadCategories()
  await loadAndRenderTodos()
  updateAuthBlock(user)
  incrementOnboardingVisitCount()
  setupOnboardingListeners()
  showOnboardingIfNeeded(user)

  supabase.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_IN') {
      const authModalEl = document.getElementById('auth-modal')
      const wasOpen = authModalEl && !authModalEl.hidden
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
    showOnboardingIfNeeded(u)
    if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED') {
      await loadCategories()
      await loadAndRenderTodos()
    }
  })
}

init()
