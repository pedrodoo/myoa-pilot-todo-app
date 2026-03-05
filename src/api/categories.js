/**
 * API layer for category CRUD operations.
 */

import { supabase } from '../supabase.js'

/**
 * Fetches all categories for a user.
 * @param {string} userId
 * @returns {Promise<{ data: Array<{ id, name, color }>, error: object | null }>}
 */
export async function fetchCategories(userId) {
  if (!supabase || !userId) return { data: [], error: null }
  const { data, error } = await supabase
    .from('categories')
    .select('id, name, color')
    .eq('user_id', userId)
    .order('name', { ascending: true })
  return { data: (data ?? []).map((r) => ({ id: r.id, name: r.name, color: r.color || '#888' })), error }
}

/**
 * Creates a new category.
 * @param {object} category - { user_id, name, color }
 */
export async function createCategory(category) {
  if (!supabase) return { error: { message: 'Supabase not configured' } }
  return supabase.from('categories').insert({
    user_id: category.user_id,
    name: category.name,
    color: category.color || '#10b981',
  })
}

/**
 * Updates a category's name or color.
 */
export async function updateCategory(id, userId, updates) {
  if (!supabase || !id || !userId) return { error: { message: 'Missing params' } }
  const payload = {}
  if (updates.name != null) payload.name = updates.name
  if (updates.color != null) payload.color = updates.color
  return supabase.from('categories').update(payload).eq('id', id).eq('user_id', userId)
}

/**
 * Updates todos that reference the old category name to the new name.
 */
export async function updateTodosCategory(userId, oldName, newName) {
  if (!supabase || !userId) return { error: { message: 'Missing params' } }
  return supabase.from('todos').update({ category: newName }).eq('user_id', userId).eq('category', oldName)
}

/**
 * Deletes a category.
 */
export async function deleteCategory(id, userId) {
  if (!supabase || !id || !userId) return { error: { message: 'Missing params' } }
  return supabase.from('categories').delete().eq('id', id).eq('user_id', userId)
}
