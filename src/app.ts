import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { PrismaClient } from '@prisma/client';
import userRoutes from './routes/user.routes';
import shiftRoutes from './routes/shift.routes';
import applicationRoutes from './routes/application.routes';
import balanceRoutes from './routes/balance.routes';
import reviewRoutes from './routes/review.routes';
import documentRoutes from './routes/document.routes';

const app = express();
const prisma = new PrismaClient();

// Создать папку uploads если не существует
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-uid'],
}));
app.options('*', cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

app.get('/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'OK', message: 'Database connected!', timestamp: new Date().toISOString() });
  } catch (e) {
    res.status(500).json({ status: 'ERROR', message: 'DB connection failed' });
  }
});

app.use('/uploads', express.static(uploadsDir));
app.use('/', userRoutes);
app.use('/', shiftRoutes);
app.use('/', applicationRoutes);
app.use('/', balanceRoutes);
app.use('/', reviewRoutes);
app.use('/', documentRoutes);

app.use((req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString(),
  });
});

export default app;