/**
 * Data loading and rendering: fetch todos/categories from API, update in-memory state, render Kanban.
 */

import { supabase } from './supabase.js'
import { fetchTodos } from './api/todos.js'
import { fetchCategories } from './api/categories.js'
import { setTodosFromDb, renderKanbanBoard } from './todos.js'
import { state } from './state.js'
import { dom } from './dom.js'
import { escapeHtml } from './utils.js'
import { getCurrentUser } from './auth.js'

/**
 * Populates category dropdowns in add-todo modal, edit-todo modal, and filter.
 */
export function populateCategoryDropdowns() {
  const { categories } = state
  const options = categories.map((c) => `<option value="${escapeHtml(c.name)}">${escapeHtml(c.name)}</option>`).join('')
  const addCatList = dom.addTodoModal.categoryList
  const editCat = dom.editTodoModal.category
  const filterCat = dom.filters.category
  if (addCatList) {
    addCatList.innerHTML = categories.map((c) => `<option value="${escapeHtml(c.name)}">`).join('')
  }
  if (editCat) {
    const current = editCat.value
    editCat.innerHTML = '<option value="">None</option>' + options
    if (categories.some((c) => c.name === current)) editCat.value = current
  }
  if (filterCat) {
    const current = filterCat.value
    filterCat.innerHTML = '<option value="">Select category</option>' + options
    if (categories.some((c) => c.name === current)) filterCat.value = current
  }
}

/**
 * Loads categories for current user and populates dropdowns.
 */
export async function loadCategories() {
  const user = await getCurrentUser()
  if (!user || !supabase) return
  const { data, error } = await fetchCategories(user.id)
  if (error) {
    console.error('Failed to load categories:', error)
    return
  }
  state.categories = data ?? []
  populateCategoryDropdowns()
}

/**
 * Loads todos from API and re-renders the Kanban board.
 * @param {string} [animateId] - Optional todo ID to animate when it appears
 */
export async function loadAndRenderTodos(animateId) {
  const user = await getCurrentUser()
  if (!user) return
  const { data, error } = await fetchTodos(user.id)
  if (error) {
    console.error('Failed to load todos:', error)
    return
  }
  setTodosFromDb(data ?? [])
  renderKanbanBoard(dom.kanban.getColumnContainers(), {
    sortBy: state.sortBy,
    sortOrder: state.sortOrder,
    categories: state.categories,
    animateId: animateId || undefined,
  })
}

/**
 * Clears todos and categories from state, re-renders empty Kanban.
 * Used when signing out.
 */
export function clearTodosAndRender() {
  setTodosFromDb([])
  state.categories = []
  renderKanbanBoard(dom.kanban.getColumnContainers(), { categories: [] })
}

/**
 * Re-renders the Kanban board with current filter/sort (no API call).
 */
export function applyFilterSortAndRender() {
  renderKanbanBoard(dom.kanban.getColumnContainers(), {
    sortBy: state.sortBy,
    sortOrder: state.sortOrder,
    categories: state.categories,
  })
}
