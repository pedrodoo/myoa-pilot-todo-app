/**
 * Onboarding guide for new visitors (step-by-step).
 */

import { COPY, ONBOARDING_VISIT_COUNT_KEY, ONBOARDING_MAX_VISITS } from './config.js'
import { dom } from './dom.js'
import { isAnonymous } from './auth.js'

const ONBOARDING_HIGHLIGHT_CLASS = 'todo-form__submit--onboarding-highlight'
let onboardingStepIndex = 0

export function getOnboardingVisitCount() {
  try {
    const n = parseInt(localStorage.getItem(ONBOARDING_VISIT_COUNT_KEY), 10)
    return Number.isFinite(n) ? Math.max(0, n) : 0
  } catch (_) {
    return 0
  }
}

export function incrementOnboardingVisitCount() {
  try {
    const count = getOnboardingVisitCount() + 1
    localStorage.setItem(ONBOARDING_VISIT_COUNT_KEY, String(count))
    return count
  } catch (_) {
    return 0
  }
}

function updateSubmitButtonHighlight() {
  const todoSubmitBtn = dom.todo.todoSubmitBtn
  const guide = dom.onboarding.guide
  if (!todoSubmitBtn) return
  const showHighlight = guide && !guide.hidden && onboardingStepIndex === 0
  todoSubmitBtn.classList.toggle(ONBOARDING_HIGHLIGHT_CLASS, showHighlight)
}

export function renderOnboardingStep() {
  const text = dom.onboarding.text
  const guide = dom.onboarding.guide
  if (!text) return
  const ob = COPY.onboarding
  const steps = ob.steps
  const step = steps[onboardingStepIndex] ?? steps[0]
  text.textContent = step.text
  const dots = guide?.querySelectorAll('.onboarding__step-dot')
  if (dots) {
    dots.forEach((d, i) => {
      d.setAttribute('aria-selected', i === onboardingStepIndex ? 'true' : 'false')
      d.setAttribute('tabindex', i === onboardingStepIndex ? '0' : '-1')
    })
  }
  updateSubmitButtonHighlight()
}

export function dismissOnboarding() {
  const guide = dom.onboarding.guide
  if (guide) {
    guide.hidden = true
    guide.setAttribute('aria-hidden', 'true')
  }
  updateSubmitButtonHighlight()
}

export function showOnboardingIfNeeded(user) {
  const guide = dom.onboarding.guide
  if (!user || !isAnonymous(user)) {
    if (guide) {
      guide.hidden = true
      guide.setAttribute('aria-hidden', 'true')
    }
    updateSubmitButtonHighlight()
    return
  }
  try {
    const visitCount = getOnboardingVisitCount()
    if (visitCount > ONBOARDING_MAX_VISITS) {
      if (guide) {
        guide.hidden = true
        guide.setAttribute('aria-hidden', 'true')
      }
      updateSubmitButtonHighlight()
      return
    }
  } catch (_) {}
  onboardingStepIndex = 0
  renderOnboardingStep()
  if (guide) {
    guide.hidden = false
    guide.removeAttribute('aria-hidden')
  }
  updateSubmitButtonHighlight()
}

export function setupOnboardingListeners() {
  const guide = dom.onboarding.guide
  guide?.addEventListener('click', (e) => {
    const dot = e.target.closest('.onboarding__step-dot')
    if (!dot) return
    const step = parseInt(dot.getAttribute('data-step'), 10)
    if (Number.isFinite(step) && step >= 0 && step < COPY.onboarding.steps.length) {
      onboardingStepIndex = step
      renderOnboardingStep()
    }
  })
}
