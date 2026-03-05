/**
 * Todo handlers: form submit, column +, drag-drop, inline edit, filter/sort, card edit/delete.
 */

import { supabase } from './supabase.js'
import { dom } from './dom.js'
import { state } from './state.js'
import { getTodo, updateTodo, setTodoStatus } from './todos.js'
import { insertTodo, updateTodoStatus, updateTodo as apiUpdateTodo } from './api/todos.js'
import { loadAndRenderTodos, applyFilterSortAndRender } from './data.js'
import { openAddTodoModal, openEditTodoModal, openDeleteConfirmModal } from './modals.js'
import { getCurrentUser } from './auth.js'

async function moveTodoToStatus(id, newStatus) {
  const user = await getCurrentUser()
  if (!id || !user) return
  const { error } = await updateTodoStatus(id, user.id, newStatus)
  if (error) {
    console.error('Failed to move todo:', error)
    return
  }
  setTodoStatus(id, newStatus)
  applyFilterSortAndRender()
}

function setupDragAndDrop() {
  document.addEventListener('dragstart', (e) => {
    const card = e.target.closest('.todo-item')
    if (!card) return
    const id = card.dataset.id ?? ''
    if (e.dataTransfer) {
      e.dataTransfer.setData('text/plain', id)
      e.dataTransfer.effectAllowed = 'move'
      e.dataTransfer.setDragImage(card, 0, 0)
    }
    card.classList.add('todo-item--dragging')
  })

  document.addEventListener('dragend', (e) => {
    const card = e.target.closest('.todo-item')
    if (card) card.classList.remove('todo-item--dragging')
  })

  document.addEventListener('dragover', (e) => {
    const list = e.target.closest('.kanban__list')
    if (!list) return
    e.preventDefault()
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'move'
    list.classList.add('kanban__list--drag-over')
  })

  document.addEventListener('dragleave', (e) => {
    const list = e.target.closest('.kanban__list')
    if (!list) return
    if (!list.contains(e.relatedTarget)) list.classList.remove('kanban__list--drag-over')
  })

  document.addEventListener('drop', (e) => {
    const list = e.target.closest('.kanban__list')
    if (!list) return
    e.preventDefault()
    list.classList.remove('kanban__list--drag-over')
    const id = e.dataTransfer ? e.dataTransfer.getData('text/plain') : ''
    const columnStatus = list.parentElement?.getAttribute('data-status')
    if (id && columnStatus) moveTodoToStatus(id, columnStatus)
  })
}

function setupTodoForm() {
  const form = dom.todo.form
  const input = dom.todo.input
  if (!form || !input) return
  form.addEventListener('submit', (e) => {
    e.preventDefault?.()
    const text = input.value.trim()
    if (!text) return
    if (!supabase) {
      console.error('Supabase is not configured.')
      return
    }
    state.pendingAddTodoText = text
    state.pendingAddTodoStatus = 'tasks'
    input.value = ''
    openAddTodoModal()
  })
}

function setupMobileAddBar() {
  const bar = dom.mobileAddBar.el
  const barInput = dom.mobileAddBar.input
  if (!bar || !barInput) return
  bar.addEventListener('submit', async (e) => {
    e.preventDefault?.()
    const text = barInput.value.trim()
    if (!text || !supabase) return
    const user = await getCurrentUser()
    if (!user) return
    const { data, error } = await insertTodo({
      text,
      is_complete: false,
      status: 'tasks',
      user_id: user.id,
      importance: null,
      due_date: null,
      category: null,
    })
    if (error) {
      console.error('Failed to insert todo:', error)
      return
    }
    barInput.value = ''
    await loadAndRenderTodos(data?.id)
  })
}

function setupColumnAddButtons() {
  const kanbanEl = dom.kanban.el || document
  kanbanEl.addEventListener('click', (e) => {
    const btn = e.target.closest('.kanban__add-btn')
    if (!btn) return
    e.preventDefault()
    const status = btn.getAttribute('data-add-to-status')
    if (!status) return
    if (!supabase) {
      console.error('Supabase is not configured.')
      return
    }
    state.pendingAddTodoText = null
    state.pendingAddTodoStatus = status
    openAddTodoModal()
  })
}

function setupInlineEdit() {
  const kanbanEl = dom.kanban.el || document
  kanbanEl.addEventListener('click', (e) => {
    const textEl = e.target.closest('.todo-item__text')
    if (!textEl || textEl.closest('.todo-item__text-input-wrap')) return
    const li = textEl.closest('.todo-item')
    if (!li?.dataset?.id) return
    if (li.querySelector('.todo-item__text-input')) return
    const id = li.dataset.id
    const currentText = textEl.textContent || ''
    const row = textEl.closest('.todo-item__row')
    if (!row) return
    const wrap = document.createElement('div')
    wrap.className = 'todo-item__text-input-wrap'
    const input = document.createElement('input')
    input.type = 'text'
    input.className = 'todo-item__text-input'
    input.value = currentText
    input.setAttribute('aria-label', 'Edit task')
    wrap.appendChild(input)
    textEl.replaceWith(wrap)
    input.focus()
    input.select()

    let committed = false
    function commit() {
      if (committed) return
      committed = true
      const newText = input.value.trim()
      const finalText = newText || currentText
      const span = document.createElement('span')
      span.className = 'todo-item__text'
      span.textContent = finalText
      wrap.replaceWith(span)
      if (finalText !== currentText) {
        updateTodo(id, { text: finalText })
        getCurrentUser().then((user) => {
          if (!user) return
          apiUpdateTodo(id, user.id, { text: finalText })
        })
      }
    }

    function cancel() {
      if (committed) return
      committed = true
      const span = document.createElement('span')
      span.className = 'todo-item__text'
      span.textContent = currentText
      wrap.replaceWith(span)
    }

    input.addEventListener('blur', commit, { once: true })
    input.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter') {
        ev.preventDefault()
        commit()
      } else if (ev.key === 'Escape') {
        ev.preventDefault()
        cancel()
      }
    })
  })
}

function setupCardActions() {
  const kanbanEl = dom.kanban.el || document
  kanbanEl.addEventListener('click', async (e) => {
    const li = e.target.closest('.todo-item')
    if (!li) return
    const id = li?.dataset?.id
    const action = e.target.closest('[data-action]')?.dataset?.action

    if (action === 'edit') {
      e.preventDefault()
      openEditTodoModal(id)
      return
    }

    const deleteBtn = e.target.closest('.todo-item__delete')
    if (!deleteBtn) return
    e.preventDefault()
    if (!id) return
    openDeleteConfirmModal(id)
  })
}

function setupFilterSort() {
  const filters = dom.filters
  if (filters.sortBy) {
    filters.sortBy.addEventListener('change', () => {
      state.sortBy = filters.sortBy.value
      applyFilterSortAndRender()
    })
  }
  if (filters.sortOrder) {
    filters.sortOrder.addEventListener('change', () => {
      state.sortOrder = filters.sortOrder.value
      applyFilterSortAndRender()
    })
  }
  if (filters.type) {
    filters.type.addEventListener('change', () => {
      state.filterTypeVal = filters.type.value
      if (filters.category) filters.category.hidden = state.filterTypeVal !== 'category'
      applyFilterSortAndRender()
    })
  }
  if (filters.category) {
    filters.category.addEventListener('change', () => applyFilterSortAndRender())
  }
}

/**
 * Initialize all todo-related event listeners.
 */
export function initTodoHandlers() {
  setupDragAndDrop()
  setupTodoForm()
  setupMobileAddBar()
  setupColumnAddButtons()
  setupInlineEdit()
  setupCardActions()
  setupFilterSort()
}
