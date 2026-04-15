import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';

import userRoutes from './routes/user.routes';
import shiftRoutes from './routes/shift.routes';
import applicationRoutes from './routes/application.routes';
import balanceRoutes from './routes/balance.routes';

const app = express();
const prisma = new PrismaClient();

// ── CORS должен быть ПЕРВЫМ ──────────────────────────
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-uid'],
}));

// Preflight для всех роутов
app.options('*', cors());

// JSON парсер
app.use(express.json());

// Логирование
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Health check
app.get('/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      status: 'OK',
      message: 'Database connected!',
      timestamp: new Date().toISOString(),
    });
  } catch (e) {
    res.status(500).json({ status: 'ERROR', message: 'DB connection failed' });
  }
});

// ── Роуты (ПОСЛЕ cors и express.json) ───────────────
app.use('/', userRoutes);
app.use('/', shiftRoutes);
app.use('/', applicationRoutes);
app.use('/', balanceRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString(),
  });
});

export default app;