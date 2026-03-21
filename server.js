const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const app = express();
app.use(cors());
app.use(express.json());

// Подключение роутов
const userRoutes = require('./src/routes/userRoutes');
const shiftRoutes = require('./src/routes/shiftRoutes');
const seekerRoutes = require('./src/routes/seekerRoutes');

app.use('/users', userRoutes);
app.use('/shifts', shiftRoutes);
app.use('/seeker', seekerRoutes);

// Health check
app.get('/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({ 
      status: 'OK', 
      message: 'Database connected!',
      timestamp: new Date().toISOString()
    });
  } catch (e) {
    res.status(500).json({ 
      status: 'ERROR', 
      error: e.message 
    });
  }
});

// Корневой эндпоинт
app.get('/', (req, res) => {
  res.json({
    message: 'ASAP HORECA Backend is running!',
    version: '1.0.0',
    endpoints: ['/health', '/users/sync', '/shifts', '/seeker/status']
  });
});

// ПРАВИЛЬНЫЙ ЗАПУСК СЕРВЕРА ДЛЯ RENDER
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`✅ Health check: http://localhost:${PORT}/health`);
});
