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
import adminRoutes from './routes/admin.routes';
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
app.use('/', adminRoutes);
app.get("/privacy", (req, res) => {
  res.send(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Политика конфиденциальности — МигРабота</title></head><body style="font-family:Arial;max-width:800px;margin:40px auto;padding:0 20px"><h1>Политика конфиденциальности МигРабота</h1><p>Дата вступления в силу: 11 июня 2026 г.</p><h2>1. Общие положения</h2><p>Настоящая политика описывает порядок сбора, хранения и использования персональных данных пользователей мобильного приложения МигРабота.</p><h2>2. Какие данные мы собираем</h2><p>Номер телефона — для аутентификации через SMS. Имя и фотография профиля — для отображения в карточке соискателя или работодателя. Push-токен устройства — для отправки уведомлений о новых сменах. Документы (фото) — по желанию пользователя для верификации.</p><h2>3. Как мы используем данные</h2><p>Данные используются исключительно для работы платформы: публикации и поиска смен, формирования рейтинга AI Score, проведения выплат через виртуальный кошелёк и отправки push-уведомлений.</p><h2>4. Хранение и защита данных</h2><p>Данные хранятся на защищённых серверах PostgreSQL (Neon, США). Передача данных третьим лицам не осуществляется. Соединение защищено протоколом HTTPS.</p><h2>5. Права пользователя</h2><p>Пользователь вправе запросить удаление своих данных, обратившись по контактному адресу ниже.</p><h2>6. Контакты</h2><p>По вопросам обработки данных: migrabota@gmail.com</p></body></html>`);
});


app.use((req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString(),
  });
});

export default app;