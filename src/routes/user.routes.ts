import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
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
const prisma = new PrismaClient();

// ── Основные ─────────────────────────────────────────
router.post('/users/sync', sync);
router.patch('/seeker/status', toggleHot);
router.get('/users/me', getMe);
router.patch('/users/me', patchMe);

// ── Сохранить push-токен устройства ──────────────────
router.patch('/users/:id/push-token', async (req, res) => {
  try {
    const { pushToken } = req.body;
    if (!pushToken) {
      return res.status(400).json({ error: 'pushToken обязателен' });
    }
    await prisma.user.update({
      where: { id: req.params.id },
      data: { pushToken }
    });
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ── Профиль по ID ─────────────────────────────────────
router.get('/users/:id', getUserProfile);

// ── Обновить профиль по ID ───────────────────────────
router.patch('/users/:id/profile', updateUserProfile);

// ── Поставить рейтинг ─────────────────────────────────
router.post('/users/:id/rate', rateWorker);

export default router;