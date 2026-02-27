/** In-memory todo list (no backend). Each item: { id, text, completed }. */
let todos = [];

/**
 * Adds a new todo. Trims text and skips if empty; creates an item with a UUID and completed: false.
 */
export function addTodo(text) {
  const trimmed = text.trim();
  if (!trimmed) return;
  todos.push({
    id: crypto.randomUUID(),
    text: trimmed,
    completed: false,
  });
}

/**
 * Toggles the completed state of the todo with the given id (if found).
 */
export function toggleTodo(id) {
  const todo = todos.find((t) => t.id === id);
  if (todo) {
    todo.completed = !todo.completed;
  }
}

/**
 * Removes the todo with the given id from the list.
 */
export function removeTodo(id) {
  todos = todos.filter((t) => t.id !== id);
}

/**
 * Renders the full todo list into the given container. Clears it first, then builds one <li> per todo
 * with checkbox, text (escaped), and delete button; adds --completed class when todo is done.
 */
export function renderTodoList(container) {
  if (!container) return;
  container.innerHTML = '';
  for (const todo of todos) {
    const li = document.createElement('li');
    li.className = 'todo-item' + (todo.completed ? ' todo-item--completed' : '');
    li.dataset.id = todo.id;
    li.innerHTML = `
      <label class="todo-item__row">
        <input type="checkbox" class="todo-item__checkbox" ${todo.completed ? 'checked' : ''} data-action="toggle" />
        <span class="todo-item__text">${escapeHtml(todo.text)}</span>
      </label>
      <button type="button" class="todo-item__delete" data-action="delete" aria-label="Delete">Delete</button>
    `;
    container.appendChild(li);
  }
}

/** Escapes a string so it can be safely used in innerHTML (avoids XSS). */
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
