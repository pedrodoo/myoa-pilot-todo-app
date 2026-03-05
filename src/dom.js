/**
 * DOM references grouped by UI area.
 * All getElementById/querySelector calls in one place.
 */

const form = document.getElementById('todo-form')

export const dom = {
  auth: {
    block: document.getElementById('auth-block'),
    modal: document.getElementById('auth-modal'),
    modalBackdrop: document.getElementById('auth-modal-backdrop'),
    modalTitle: document.getElementById('auth-modal-title'),
    modalMessage: document.getElementById('auth-modal-message'),
    form: document.getElementById('auth-form'),
    email: document.getElementById('auth-email'),
    password: document.getElementById('auth-password'),
    submit: document.getElementById('auth-submit'),
    cancel: document.getElementById('auth-cancel'),
    passwordToggle: document.querySelector('.auth-form__password-toggle'),
    formEmailRow: document.getElementById('auth-form-email-row'),
    formPasswordRow: document.getElementById('auth-form-password-row'),
    formRecover: document.getElementById('auth-form-recover'),
    formBack: document.getElementById('auth-form-back'),
    formSetPassword: document.getElementById('auth-form-set-password'),
    newPassword: document.getElementById('auth-new-password'),
    passwordConfirm: document.getElementById('auth-password-confirm'),
  },
  todo: {
    form,
    todoSubmitBtn: form?.querySelector('.todo-form__submit'),
    input: document.getElementById('todo-input'),
  },
  kanban: {
    el: document.getElementById('kanban'),
    getColumnContainers: () => ({
      tasks: document.getElementById('kanban-list-tasks'),
      to_do: document.getElementById('kanban-list-to_do'),
      doing: document.getElementById('kanban-list-doing'),
      completed: document.getElementById('kanban-list-completed'),
    }),
  },
  addTodoModal: {
    el: document.getElementById('add-todo-modal'),
    backdrop: document.getElementById('add-todo-modal-backdrop'),
    text: document.getElementById('add-todo-modal-text'),
    form: document.getElementById('add-todo-modal-form'),
    importance: document.getElementById('add-todo-modal-importance'),
    dueDate: document.getElementById('add-todo-modal-due-date'),
    category: document.getElementById('add-todo-modal-category'),
    categoryList: document.getElementById('add-todo-modal-category-list'),
    task: document.getElementById('add-todo-modal-task'),
    close: document.getElementById('add-todo-modal-close'),
  },
  editTodoModal: {
    el: document.getElementById('edit-todo-modal'),
    backdrop: document.getElementById('edit-todo-modal-backdrop'),
    form: document.getElementById('edit-todo-modal-form'),
    text: document.getElementById('edit-todo-modal-text'),
    importance: document.getElementById('edit-todo-modal-importance'),
    dueDate: document.getElementById('edit-todo-modal-due-date'),
    category: document.getElementById('edit-todo-modal-category'),
    status: document.getElementById('edit-todo-modal-status'),
    cancel: document.getElementById('edit-todo-modal-cancel'),
  },
  deleteConfirm: {
    backdrop: document.getElementById('delete-confirm-backdrop'),
    modal: document.getElementById('delete-confirm-modal'),
    title: document.getElementById('delete-confirm-title'),
    message: document.getElementById('delete-confirm-message'),
    yes: document.getElementById('delete-confirm-yes'),
    cancel: document.getElementById('delete-confirm-cancel'),
  },
  categoriesModal: {
    el: document.getElementById('categories-modal'),
    backdrop: document.getElementById('categories-modal-backdrop'),
    close: document.getElementById('categories-modal-close'),
    form: document.getElementById('categories-form'),
    nameInput: document.getElementById('category-name'),
    colorInput: document.getElementById('category-color'),
    listEl: document.getElementById('categories-list'),
  },
  filters: {
    sortBy: document.getElementById('filter-sort-by'),
    sortOrder: document.getElementById('filter-sort-order'),
    type: document.getElementById('filter-type'),
    category: document.getElementById('filter-category'),
    manageCategoriesBtn: document.getElementById('manage-categories-btn'),
  },
  hamburger: {
    btn: document.getElementById('hamburger-btn'),
    menu: document.getElementById('hamburger-menu'),
    content: document.getElementById('hamburger-menu-content'),
    backdrop: document.getElementById('hamburger-menu-backdrop'),
  },
  mobileAddBar: {
    el: document.getElementById('mobile-add-bar'),
    input: document.getElementById('mobile-add-bar-input'),
  },
  toast: document.getElementById('toast'),
  onboarding: {
    guide: document.getElementById('onboarding-guide'),
    text: document.getElementById('onboarding-text'),
  },
}
