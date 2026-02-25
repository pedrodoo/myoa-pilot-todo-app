import './style.css'
import { addTodo, toggleTodo, removeTodo, renderTodoList } from './todos.js'

const form = document.getElementById('todo-form')
const input = document.getElementById('todo-input')
const listEl = document.getElementById('todo-list')

form.addEventListener('submit', (e) => {
  e.preventDefault()
  const text = input.value.trim()
  if (!text) return
  addTodo(text)
  input.value = ''
  renderTodoList(listEl)
})

listEl.addEventListener('change', (e) => {
  if (e.target.classList.contains('todo-item__checkbox')) {
    const li = e.target.closest('.todo-item')
    if (li?.dataset.id) {
      toggleTodo(li.dataset.id)
      renderTodoList(listEl)
    }
  }
})

listEl.addEventListener('click', (e) => {
  if (e.target.classList.contains('todo-item__delete')) {
    const li = e.target.closest('.todo-item')
    if (li?.dataset.id) {
      removeTodo(li.dataset.id)
      renderTodoList(listEl)
    }
  }
})

renderTodoList(listEl)
