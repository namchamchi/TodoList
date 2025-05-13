const { v4: uuidv4 } = require('uuid');
let todos = require('../data/todos.json');
const fs = require('fs');
const path = require('path');

const dataPath = path.join(__dirname, '../data/todos.json');

function saveTodos() {
  fs.writeFileSync(dataPath, JSON.stringify(todos, null, 2));
}

exports.getTodos = (req, res) => {
  res.json(todos);
};

exports.getTodoById = (req, res) => {
  const todo = todos.find(t => t.id === req.params.id);
  if (!todo) return res.status(404).json({ message: 'Todo not found' });
  res.json(todo);
};

exports.createTodo = (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ message: 'Text is required' });

  const newTodo = {
    id: uuidv4(),
    text,
    completed: false,
    createdAt: new Date().toISOString()
  };
  todos.push(newTodo);
  saveTodos();
  res.status(201).json(newTodo);
};

exports.updateTodo = (req, res) => {
  const todo = todos.find(t => t.id === req.params.id);
  if (!todo) return res.status(404).json({ message: 'Todo not found' });

  const { completed } = req.body;
  if (completed !== undefined) todo.completed = completed;

  saveTodos();
  res.json(todo);
};

exports.deleteTodo = (req, res) => {
  const index = todos.findIndex(t => t.id === req.params.id);
  if (index === -1) return res.status(404).json({ message: 'Todo not found' });

  const deleted = todos.splice(index, 1);
  saveTodos();
  res.json({ message: 'Todo deleted', todo: deleted[0] });
};
