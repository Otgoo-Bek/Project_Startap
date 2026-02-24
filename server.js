const express = require('express');
const app = express();

// Включаем логгирование ВСЕХ запросов
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Health endpoint
app.get('/health', (req, res) => {
  console.log('Processing /health request');
  res.json({ 
    status: 'OK',
    timestamp: new Date().toISOString(),
    pid: process.pid
  });
});

// Все остальные запросы
app.get('*', (req, res) => {
  console.log(`Unknown route: ${req.url}`);
  res.json({ 
    message: 'ASAP HORECA API',
    endpoints: ['/health']
  });
});

const PORT = 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server is listening on ALL interfaces, port ${PORT}`);
  console.log(`🔗 Local: http://localhost:${PORT}`);
  console.log(`🔗 Network: http://$(hostname -s).local:${PORT}`);
});

// Обработка ошибок
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
