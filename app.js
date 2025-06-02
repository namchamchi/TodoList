const express = require('express');
const todoRoutes = require('./routes/todoRoutes');
const app = express();

// Add CSP headers
app.use((req, res, next) => {
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net; font-src 'self' https://fonts.gstatic.com; script-src 'self' 'unsafe-inline' 'unsafe-eval';"
  );
  next();
});

// Lỗi cơ bản cho SonarQube phát hiện
var x = 10;  // Sử dụng var thay vì const/let
if (x == "10") {  // Sử dụng == thay vì ===
    console.log("x is 10");
}

app.use(express.json());
app.use(express.static('public')); // Serve static files from public directory
app.use('/api/todos', todoRoutes);

// Only start the server if this file is run directly
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`🚀 Server is running on port ${PORT}`);
  });
}

module.exports = app;
