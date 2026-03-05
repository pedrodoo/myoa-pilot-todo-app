/**
 * API layer for todo CRUD operations.
 * Centralizes Supabase calls and handles status column fallback (for older migrations).
 */

import { supabase } from '../supabase.js'

const TODOS_SELECT_COLUMNS = 'id, text, is_complete, created_at, importance, due_date, category, status'
const TODOS_SELECT_LEGACY = 'id, text, is_complete, created_at, importance, due_date, category'

function isStatusColumnMissing(error) {
  return error && (error.message || '').includes('status') && (error.message || '').includes('does not exist')
}

/**
 * Fetches all todos for a user.
 * @param {string} userId - The user's ID
 * @returns {Promise<{ data: object[] | null, error: object | null }>}
 */
export async function fetchTodos(userId) {
  if (!supabase || !userId) return { data: null, error: { message: 'Missing supabase or userId' } }
  let result = await supabase
    .from('todos')
    .select(TODOS_SELECT_COLUMNS)
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
  if (result.error && isStatusColumnMissing(result.error)) {
    result = await supabase
      .from('todos')
      .select(TODOS_SELECT_LEGACY)
      .eq('user_id', userId)
      .order('created_at', { ascending: true })
  }
  return { data: result.data ?? [], error: result.error }
}

/**
 * Inserts a new todo.
 * @param {object} todo - { text, is_complete?, status?, user_id, importance?, due_date?, category? }
 * @returns {Promise<{ data: { id: string } | null, error: object | null }>}
 */
export async function insertTodo(todo) {
  if (!supabase) return { data: null, error: { message: 'Supabase not configured' } }
  let result = await supabase
    .from('todos')
    .insert({
      text: todo.text,
      is_complete: todo.is_complete ?? false,
      status: todo.status ?? 'tasks',
      user_id: todo.user_id,
      importance: todo.importance ?? null,
      due_date: todo.due_date ?? null,
      category: todo.category ?? null,
    })
    .select('id')
    .single()
  if (result.error && isStatusColumnMissing(result.error)) {
    result = await supabase
      .from('todos')
      .insert({
        text: todo.text,
        is_complete: todo.is_complete ?? false,
        user_id: todo.user_id,
        importance: todo.importance ?? null,
        due_date: todo.due_date ?? null,
        category: todo.category ?? null,
      })
      .select('id')
      .single()
  }
  return result
}

/**
 * Updates a todo (partial update).
 * @param {string} id - Todo ID
 * @param {string} userId - User ID
 * @param {object} updates - { text?, importance?, due_date?, category?, status?, is_complete? }
 * @returns {Promise<{ error: object | null }>}
 */
export async function updateTodo(id, userId, updates) {
  if (!supabase || !id || !userId) return { error: { message: 'Missing params' } }
  const payload = {}
  if (updates.text != null) payload.text = updates.text
  if (updates.importance != null) payload.importance = updates.importance
  if (updates.due_date != null) payload.due_date = updates.due_date
  if (updates.category != null) payload.category = updates.category
  if (updates.status != null) {
    payload.status = updates.status
    payload.is_complete = updates.status === 'completed'
  }
  if (updates.is_complete != null) payload.is_complete = updates.is_complete

  let result = await supabase
    .from('todos')
    .update(payload)
    .eq('id', id)
    .eq('user_id', userId)
  if (result.error && isStatusColumnMissing(result.error)) {
    delete payload.status
    result = await supabase
      .from('todos')
      .update(payload)
      .eq('id', id)
      .eq('user_id', userId)
  }
  return result
}

/**
 * Updates only the status of a todo (for drag-and-drop).
 */
export async function updateTodoStatus(id, userId, newStatus) {
  if (!supabase || !id || !userId) return { error: { message: 'Missing params' } }
  let result = await supabase
    .from('todos')
    .update({ status: newStatus, is_complete: newStatus === 'completed' })
    .eq('id', id)
    .eq('user_id', userId)
  if (result.error && isStatusColumnMissing(result.error)) {
    result = await supabase
      .from('todos')
      .update({ is_complete: newStatus === 'completed' })
      .eq('id', id)
      .eq('user_id', userId)
  }
  return result
}

/**
 * Deletes a todo.
 */
export async function deleteTodo(id, userId) {
  if (!supabase || !id || !userId) return { error: { message: 'Missing params' } }
  return supabase.from('todos').delete().eq('id', id).eq('user_id', userId)
}
