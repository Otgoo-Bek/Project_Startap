import { Router } from 'express';
import {
  sync,
  toggleHot,
  getMe,
  patchMe,
  getUserProfile,
  updateUserProfile,
  rateWorker,
} from '../controllers/user.controller';

const router = Router();

// ── Основные ─────────────────────────────────────────
router.post('/users/sync', sync);
router.patch('/seeker/status', toggleHot);
router.get('/users/me', getMe);
router.patch('/users/me', patchMe);

// ── Профиль по ID (для работодателя) ─────────────────
router.get('/users/:id', getUserProfile);

// ── Обновление профиля по ID ─────────────────────────
router.patch('/users/:id/profile', updateUserProfile);

// ── Рейтинг ──────────────────────────────────────────
router.post('/users/:id/rate', rateWorker);

export default router;
 // Временно для просмотра БД (только для разработки!):
router.get('/users', async (req, res) => {
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();
  const users = await prisma.user.findMany({ orderBy: { createdAt: 'desc' }, take: 20 });
  res.json(users);
});