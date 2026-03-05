/**
 * Modals: add-todo, edit-todo, delete-confirm, categories.
 */

import { COPY } from './config.js'
import { dom } from './dom.js'
import { state } from './state.js'
import { escapeHtml } from './utils.js'
import { getTodo, updateTodo } from './todos.js'
import { insertTodo, updateTodo as apiUpdateTodo, deleteTodo } from './api/todos.js'
import { createCategory, updateCategory, deleteCategory, updateTodosCategory } from './api/categories.js'
import { loadCategories, loadAndRenderTodos, applyFilterSortAndRender, populateCategoryDropdowns } from './data.js'
import { getCurrentUser } from './auth.js'

/* ─── Add-todo modal ─── */
export function openAddTodoModal() {
  const m = dom.addTodoModal
  if (!m.el || !m.backdrop) return
  populateCategoryDropdowns()
  const text = state.pendingAddTodoText
  if (m.text) m.text.textContent = text ? `Add todo: "${text}"` : ''
  if (m.task) {
    m.task.value = text ?? ''
    m.task.closest('.auth-form__label')?.classList.toggle('auth-form__label--hidden', !!text)
  }
  if (m.importance) m.importance.value = ''
  if (m.dueDate) m.dueDate.value = ''
  if (m.category) m.category.value = ''
  m.el.hidden = false
  m.el.setAttribute('aria-hidden', 'false')
  m.backdrop.hidden = false
  m.backdrop.setAttribute('aria-hidden', 'false')
  if (m.task && !text) m.task.focus()
  else if (m.importance) m.importance.focus()
}

export function closeAddTodoModal() {
  const m = dom.addTodoModal
  if (!m.el || !m.backdrop) return
  m.el.hidden = true
  m.el.setAttribute('aria-hidden', 'true')
  m.backdrop.hidden = true
  m.backdrop.setAttribute('aria-hidden', 'true')
  state.pendingAddTodoText = null
  state.pendingAddTodoStatus = 'tasks'
  if (m.task) m.task.value = ''
  if (m.importance) m.importance.value = ''
  if (m.dueDate) m.dueDate.value = ''
  if (m.category) m.category.value = ''
}

/* ─── Edit-todo modal ─── */
export function openEditTodoModal(id) {
  const todo = getTodo(id)
  const m = dom.editTodoModal
  if (!todo || !m.el || !m.backdrop) return
  state.editingTodoId = id
  populateCategoryDropdowns()
  if (m.text) m.text.value = todo.text
  if (m.importance) m.importance.value = todo.importance || ''
  if (m.dueDate) m.dueDate.value = todo.dueDate || ''
  if (m.category) m.category.value = todo.category || ''
  if (m.status) m.status.value = todo.status || 'tasks'
  m.el.hidden = false
  m.el.setAttribute('aria-hidden', 'false')
  m.backdrop.hidden = false
  m.backdrop.setAttribute('aria-hidden', 'false')
  if (m.text) m.text.focus()
}

export function closeEditTodoModal() {
  const m = dom.editTodoModal
  if (!m.el || !m.backdrop) return
  m.el.hidden = true
  m.el.setAttribute('aria-hidden', 'true')
  m.backdrop.hidden = true
  m.backdrop.setAttribute('aria-hidden', 'true')
  state.editingTodoId = null
}

/* ─── Delete-confirm modal ─── */
export function openDeleteConfirmModal(id) {
  state.pendingDeleteId = id
  const dc = dom.deleteConfirm
  if (dc.title) dc.title.textContent = COPY.deleteConfirmTitle
  if (dc.message) dc.message.textContent = COPY.deleteConfirmMessage
  if (dc.backdrop) {
    dc.backdrop.hidden = false
    dc.backdrop.removeAttribute('aria-hidden')
  }
  if (dc.modal) {
    dc.modal.hidden = false
    dc.modal.removeAttribute('aria-hidden')
  }
}

export function closeDeleteConfirmModal() {
  state.pendingDeleteId = null
  const dc = dom.deleteConfirm
  if (dc.backdrop) {
    dc.backdrop.hidden = true
    dc.backdrop.setAttribute('aria-hidden', 'true')
  }
  if (dc.modal) {
    dc.modal.hidden = true
    dc.modal.setAttribute('aria-hidden', 'true')
  }
}

/* ─── Categories modal ─── */
export function openCategoriesModal() {
  const m = dom.categoriesModal
  if (!m.el || !m.backdrop) return
  renderCategoriesList()
  m.el.hidden = false
  m.el.setAttribute('aria-hidden', 'false')
  m.backdrop.hidden = false
  m.backdrop.setAttribute('aria-hidden', 'false')
  if (m.nameInput) m.nameInput.focus()
}

export function closeCategoriesModal() {
  const m = dom.categoriesModal
  if (!m.el || !m.backdrop) return
  m.el.hidden = true
  m.el.setAttribute('aria-hidden', 'true')
  m.backdrop.hidden = true
  m.backdrop.setAttribute('aria-hidden', 'true')
}

function renderCategoriesList() {
  const listEl = dom.categoriesModal.listEl
  if (!listEl) return
  const { categories } = state
  listEl.innerHTML = categories
    .map((c) => {
      const hasId = c.id != null
      const nameAttrs = hasId
        ? ` data-category-id="${escapeHtml(String(c.id))}" data-category-name="${escapeHtml(c.name)}" data-category-color="${escapeHtml(c.color)}"`
        : ''
      return `<li class="categories-list__item">
        <span class="categories-list__swatch" style="background-color:${escapeHtml(c.color)}" aria-hidden="true"></span>
        <span class="categories-list__name todo-item__category-pill" style="color:${escapeHtml(c.color)}"${nameAttrs}>${escapeHtml(c.name)}</span>
        ${hasId ? `<input type="color" class="categories-list__color-input" value="${escapeHtml(c.color)}" data-category-id="${escapeHtml(String(c.id))}" aria-label="Change color for ${escapeHtml(c.name)}" />` : ''}
        ${hasId ? `<button type="button" class="categories-list__delete" data-category-id="${escapeHtml(String(c.id))}" aria-label="Delete category ${escapeHtml(c.name)}">
          <svg class="categories-list__delete-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>` : ''}
      </li>`
    })
    .join('')
}

/**
 * Initialize all modal event listeners.
 */
export function initModals() {
  const add = dom.addTodoModal
  const edit = dom.editTodoModal
  const del = dom.deleteConfirm
  const cat = dom.categoriesModal

  if (add.form) {
    add.form.addEventListener('submit', async (e) => {
      e.preventDefault?.()
      const text = (add.task?.value?.trim() ?? state.pendingAddTodoText ?? '').trim()
      const user = await getCurrentUser()
      if (!text || !user) return
      const importance = add.importance?.value?.trim() || null
      const dueDate = add.dueDate?.value?.trim() || null
      let category = add.category?.value?.trim() || null
      const status = state.pendingAddTodoStatus || 'tasks'
      if (category && !state.categories.some((c) => c.name === category)) {
        const { error } = await createCategory({ user_id: user.id, name: category, color: '#10b981' })
        if (!error) await loadCategories()
      }
      const { data, error } = await insertTodo({
        text,
        is_complete: status === 'completed',
        status,
        user_id: user.id,
        importance,
        due_date: dueDate || null,
        category,
      })
      if (error) {
        console.error('Failed to insert todo:', error)
        if (dom.todo.input) dom.todo.input.value = text
        closeAddTodoModal()
        return
      }
      closeAddTodoModal()
      await loadAndRenderTodos(data?.id)
      if (dom.todo.input) dom.todo.input.focus()
    })
  }

  if (add.close) add.close.addEventListener('click', () => {
    if (dom.todo.input) dom.todo.input.value = state.pendingAddTodoText ?? dom.todo.input.value
    closeAddTodoModal()
  })
  if (add.backdrop) add.backdrop.addEventListener('click', () => {
    if (dom.todo.input) dom.todo.input.value = state.pendingAddTodoText ?? dom.todo.input.value
    closeAddTodoModal()
  })

  if (edit.form) {
    edit.form.addEventListener('submit', async (e) => {
      e.preventDefault?.()
      const id = state.editingTodoId
      const user = await getCurrentUser()
      if (!id || !user) return
      const text = edit.text?.value?.trim() ?? ''
      const importance = edit.importance?.value?.trim() || null
      const dueDate = edit.dueDate?.value?.trim() || null
      const category = edit.category?.value?.trim() || null
      const status = edit.status?.value?.trim() || 'tasks'
      const { error } = await apiUpdateTodo(id, user.id, {
        text: text || getTodo(id)?.text,
        importance,
        due_date: dueDate || null,
        category,
        status,
      })
      if (error) {
        console.error('Failed to update todo:', error)
        return
      }
      updateTodo(id, {
        text: text || getTodo(id)?.text,
        importance,
        dueDate: dueDate || null,
        category,
        status,
      })
      closeEditTodoModal()
      applyFilterSortAndRender()
    })
  }
  if (edit.cancel) edit.cancel.addEventListener('click', closeEditTodoModal)
  if (edit.backdrop) edit.backdrop.addEventListener('click', closeEditTodoModal)

  if (del.yes) {
    del.yes.addEventListener('click', async () => {
      const id = state.pendingDeleteId
      const user = await getCurrentUser()
      if (!id || !user) return
      closeDeleteConfirmModal()
      const { error } = await deleteTodo(id, user.id)
      if (error) {
        console.error('Failed to delete todo:', error)
        return
      }
      await loadAndRenderTodos()
    })
  }
  if (del.cancel) del.cancel.addEventListener('click', closeDeleteConfirmModal)
  if (del.backdrop) del.backdrop.addEventListener('click', closeDeleteConfirmModal)

  if (dom.filters.manageCategoriesBtn) dom.filters.manageCategoriesBtn.addEventListener('click', openCategoriesModal)
  if (cat.close) cat.close.addEventListener('click', closeCategoriesModal)
  if (cat.backdrop) cat.backdrop.addEventListener('click', closeCategoriesModal)

  if (cat.form) {
    cat.form.addEventListener('submit', async (e) => {
      e.preventDefault?.()
      const name = cat.nameInput?.value?.trim()
      const user = await getCurrentUser()
      if (!name || !user) return
      const color = cat.colorInput?.value || '#10b981'
      const { error } = await createCategory({ user_id: user.id, name, color })
      if (error) {
        console.error('Failed to add category:', error)
        return
      }
      if (cat.nameInput) cat.nameInput.value = ''
      if (cat.colorInput) cat.colorInput.value = '#10b981'
      await loadCategories()
      renderCategoriesList()
      applyFilterSortAndRender()
    })
  }

  if (cat.listEl) {
    cat.listEl.addEventListener('click', async (e) => {
      const btn = e.target.closest('.categories-list__delete')
      if (!btn) return
      const id = btn.dataset.categoryId
      const user = await getCurrentUser()
      if (!id || !user) return
      const { error } = await deleteCategory(id, user.id)
      if (error) {
        console.error('Failed to delete category:', error)
        return
      }
      await loadCategories()
      renderCategoriesList()
      applyFilterSortAndRender()
    })

    cat.listEl.addEventListener('change', async (e) => {
      const colorInput = e.target.closest('.categories-list__color-input')
      if (!colorInput) return
      const id = colorInput.dataset.categoryId
      const user = await getCurrentUser()
      if (!id || !user) return
      const color = colorInput.value || '#888'
      const { error } = await updateCategory(id, user.id, { color })
      if (error) {
        console.error('Failed to update category color:', error)
        return
      }
      await loadCategories()
      renderCategoriesList()
      applyFilterSortAndRender()
    })

    cat.listEl.addEventListener('click', (e) => {
      const nameEl = e.target.closest('.categories-list__name')
      if (!nameEl || nameEl.closest('.categories-list__edit-wrap')) return
      if (nameEl.querySelector('.categories-list__edit-name')) return
      const categoryId = nameEl.dataset.categoryId
      if (!categoryId) return
      const oldName = nameEl.dataset.categoryName || ''
      const oldColor = nameEl.dataset.categoryColor || '#888'
      const item = nameEl.closest('.categories-list__item')
      if (!item) return
      const wrap = document.createElement('span')
      wrap.className = 'categories-list__edit-wrap'
      const input = document.createElement('input')
      input.type = 'text'
      input.className = 'categories-list__edit-name'
      input.value = oldName
      input.setAttribute('aria-label', 'Category name')
      wrap.appendChild(input)
      nameEl.replaceWith(wrap)
      input.focus()
      input.select()

      let committed = false
      function commit() {
        if (committed) return
        committed = true
        const newName = (input.value && input.value.trim()) || oldName
        const span = document.createElement('span')
        span.className = 'categories-list__name todo-item__category-pill'
        span.style.color = oldColor
        span.dataset.categoryId = categoryId
        span.dataset.categoryName = newName
        span.dataset.categoryColor = oldColor
        span.textContent = newName
        wrap.replaceWith(span)
        if (newName === oldName) return
        getCurrentUser().then(async (user) => {
          if (!user) return
          const { error } = await updateCategory(categoryId, user.id, { name: newName })
          if (error) {
            console.error('Failed to update category name:', error)
            return
          }
          const { error: todosError } = await updateTodosCategory(user.id, oldName, newName)
          if (todosError) console.error('Failed to update todos category:', todosError)
          await loadCategories()
          renderCategoriesList()
          applyFilterSortAndRender()
        })
      }

      function cancel() {
        if (committed) return
        committed = true
        const span = document.createElement('span')
        span.className = 'categories-list__name todo-item__category-pill'
        span.style.color = oldColor
        span.dataset.categoryId = categoryId
        span.dataset.categoryName = oldName
        span.dataset.categoryColor = oldColor
        span.textContent = oldName
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
}
