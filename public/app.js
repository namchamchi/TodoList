const API_URL = '/api/todos';

// DOM Elements
const todoForm = document.getElementById('todoForm');
const todoInput = document.getElementById('todoInput');
const todoList = document.getElementById('todoList');

// Loading state
let isLoading = false;

// Fetch all todos
async function fetchTodos() {
    try {
        isLoading = true;
        showLoading();
        const response = await fetch(API_URL);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const todos = await response.json();
        renderTodos(todos);
    } catch (error) {
        console.error('Error fetching todos:', error);
        showNotification('Error loading todos: ' + error.message, 'error');
    } finally {
        isLoading = false;
        hideLoading();
    }
}

// Create new todo
async function createTodo(text) {
    if (isLoading) return;
    
    try {
        isLoading = true;
        showLoading();
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ text }),
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to create todo');
        }
        
        const newTodo = await response.json();
        todoList.insertAdjacentHTML('afterbegin', createTodoElement(newTodo));
        showNotification('Todo added successfully!', 'success');
    } catch (error) {
        console.error('Error creating todo:', error);
        showNotification('Error creating todo: ' + error.message, 'error');
    } finally {
        isLoading = false;
        hideLoading();
    }
}

// Update todo
async function updateTodo(id, completed) {
    if (isLoading) return;
    
    try {
        isLoading = true;
        showLoading();
        const response = await fetch(`${API_URL}/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ completed }),
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to update todo');
        }
        
        const updatedTodo = await response.json();
        const todoElement = document.querySelector(`[data-id="${id}"]`);
        if (todoElement) {
            todoElement.classList.toggle('completed', completed);
        }
        showNotification('Todo updated successfully!', 'success');
    } catch (error) {
        console.error('Error updating todo:', error);
        showNotification('Error updating todo: ' + error.message, 'error');
    } finally {
        isLoading = false;
        hideLoading();
    }
}

// Delete todo
async function deleteTodo(id) {
    if (isLoading) return;
    
    try {
        isLoading = true;
        showLoading();
        const response = await fetch(`${API_URL}/${id}`, {
            method: 'DELETE',
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to delete todo');
        }
        
        const todoElement = document.querySelector(`[data-id="${id}"]`);
        if (todoElement) {
            todoElement.remove();
        }
        showNotification('Todo deleted successfully!', 'success');
    } catch (error) {
        console.error('Error deleting todo:', error);
        showNotification('Error deleting todo: ' + error.message, 'error');
    } finally {
        isLoading = false;
        hideLoading();
    }
}

// Create todo element
function createTodoElement(todo) {
    return `
        <div class="todo-item flex items-center justify-between p-4 bg-gray-50 rounded-lg ${todo.completed ? 'completed' : ''}" data-id="${todo.id}">
            <div class="flex items-center gap-3">
                <input type="checkbox" 
                       class="w-5 h-5 rounded border-gray-300 text-blue-500 focus:ring-blue-500"
                       ${todo.completed ? 'checked' : ''}
                       onchange="updateTodo('${todo.id}', this.checked)">
                <span class="todo-text text-gray-700">${todo.text}</span>
            </div>
            <button onclick="deleteTodo('${todo.id}')"
                    class="text-red-500 hover:text-red-700 transition-colors">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
            </button>
        </div>
    `;
}

// Render todos
function renderTodos(todos) {
    todoList.innerHTML = todos.map(todo => createTodoElement(todo)).join('');
}

// Show notification
function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 p-4 rounded-lg shadow-lg ${
        type === 'success' ? 'bg-green-500' : 'bg-red-500'
    } text-white transform transition-all duration-300 translate-x-full`;
    notification.textContent = message;
    document.body.appendChild(notification);

    // Animate in
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 100);

    // Remove after 3 seconds
    setTimeout(() => {
        notification.style.transform = 'translateX(full)';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Loading indicator
function showLoading() {
    const loading = document.createElement('div');
    loading.id = 'loading';
    loading.className = 'fixed top-0 left-0 w-full h-1 bg-blue-500 animate-pulse';
    document.body.appendChild(loading);
}

function hideLoading() {
    const loading = document.getElementById('loading');
    if (loading) {
        loading.remove();
    }
}

// Event Listeners
todoForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = todoInput.value.trim();
    if (text && !isLoading) {
        await createTodo(text);
        todoInput.value = '';
    }
});

// Initial load
fetchTodos(); 