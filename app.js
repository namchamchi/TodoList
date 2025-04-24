const express = require('express');
const todoRoutes = require('./routes/todoRoutes');
const app = express();

app.use(express.json());
app.use('/api/todos', todoRoutes);

// Only start the server if this file is run directly
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`🚀 Server is running on port ${PORT}`);
  });
}

module.exports = app;
