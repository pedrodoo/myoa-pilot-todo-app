/**
 * Shared application state.
 */

export const state = {
  categories: [],
  sortBy: 'created',
  sortOrder: 'asc',
  filterTypeVal: 'all',
  filterValue: null,
  pendingAddTodoText: null,
  pendingAddTodoStatus: 'tasks',
  editingTodoId: null,
  pendingDeleteId: null,
}
