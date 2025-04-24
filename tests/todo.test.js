const request = require('supertest');
const app = require('../app');
const fs = require('fs');
const path = require('path');

// Path to the todos.json file
const dataPath = path.join(__dirname, '../data/todos.json');

// Backup the original todos data
let originalTodos;

beforeAll(() => {
  // Read and backup the original todos
  originalTodos = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
});

afterEach(() => {
  // Restore the original todos after each test
  fs.writeFileSync(dataPath, JSON.stringify(originalTodos, null, 2));
});

describe('Todo API Tests', () => {
  describe('GET /api/todos', () => {
    it('should return all todos', async () => {
      const response = await request(app).get('/api/todos');
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('GET /api/todos/:id', () => {
    it('should return a specific todo when it exists', async () => {
      // First create a todo to get its ID
      const createResponse = await request(app)
        .post('/api/todos')
        .send({ title: 'Test Todo' });
      
      const todoId = createResponse.body.id;
      const response = await request(app).get(`/api/todos/${todoId}`);
      
      expect(response.status).toBe(200);
      expect(response.body.id).toBe(todoId);
      expect(response.body.title).toBe('Test Todo');
    });

    it('should return 404 when todo does not exist', async () => {
      const response = await request(app).get('/api/todos/nonexistent-id');
      expect(response.status).toBe(404);
      expect(response.body.message).toBe('Todo not found');
    });
  });

  describe('POST /api/todos', () => {
    it('should create a new todo', async () => {
      const newTodo = {
        title: 'New Test Todo',
        description: 'Test Description'
      };

      const response = await request(app)
        .post('/api/todos')
        .send(newTodo);

      expect(response.status).toBe(201);
      expect(response.body.title).toBe(newTodo.title);
      expect(response.body.description).toBe(newTodo.description);
      expect(response.body.completed).toBe(false);
      expect(response.body.id).toBeDefined();
      expect(response.body.createdAt).toBeDefined();
    });

    it('should return 400 when title is missing', async () => {
      const response = await request(app)
        .post('/api/todos')
        .send({ description: 'No title' });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Title is required');
    });
  });

  describe('PUT /api/todos/:id', () => {
    it('should update an existing todo', async () => {
      // First create a todo
      const createResponse = await request(app)
        .post('/api/todos')
        .send({ title: 'Todo to Update' });
      
      const todoId = createResponse.body.id;
      
      const updateData = {
        title: 'Updated Title',
        description: 'Updated Description',
        completed: true
      };

      const response = await request(app)
        .put(`/api/todos/${todoId}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.title).toBe(updateData.title);
      expect(response.body.description).toBe(updateData.description);
      expect(response.body.completed).toBe(updateData.completed);
    });

    it('should return 404 when updating non-existent todo', async () => {
      const response = await request(app)
        .put('/api/todos/nonexistent-id')
        .send({ title: 'Updated Title' });

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('Todo not found');
    });
  });

  describe('DELETE /api/todos/:id', () => {
    it('should delete an existing todo', async () => {
      // First create a todo
      const createResponse = await request(app)
        .post('/api/todos')
        .send({ title: 'Todo to Delete' });
      
      const todoId = createResponse.body.id;
      
      const response = await request(app).delete(`/api/todos/${todoId}`);
      
      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Todo deleted');
      expect(response.body.todo.id).toBe(todoId);

      // Verify the todo is actually deleted
      const getResponse = await request(app).get(`/api/todos/${todoId}`);
      expect(getResponse.status).toBe(404);
    });

    it('should return 404 when deleting non-existent todo', async () => {
      const response = await request(app).delete('/api/todos/nonexistent-id');
      expect(response.status).toBe(404);
      expect(response.body.message).toBe('Todo not found');
    });
  });
});
