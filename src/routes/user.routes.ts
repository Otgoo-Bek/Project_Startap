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

// ── Основные (без параметров — должны быть первыми!) ──
router.post('/users/sync', sync);
router.patch('/seeker/status', toggleHot);
router.get('/users/me', getMe);
router.patch('/users/me', patchMe);

// ── Временный роут — список всех пользователей ────────
// ВАЖНО: должен быть ДО /users/:id !
router.get('/users', async (req, res) => {
  try {
    // as any — потому что ratingCount новое поле, Prisma Client ещё не обновился
    const users = await (prisma.user.findMany as any)({
      orderBy: { createdAt: 'desc' },
      take: 50
    });
    // Возвращаем только нужные поля
    const result = users.map((u: any) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      aiScore: u.aiScore,
      ratingCount: u.ratingCount,
      isHot: u.isHot,
      createdAt: u.createdAt,
    }));
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ── Горячие соискатели ────────────────────────────────
router.get('/workers/hot', async (req, res) => {
  try {
    const workers = await prisma.user.findMany({
      where: { role: 'B2C', isHot: true },
      select: {
        id: true,
        name: true,
        email: true,
        experience: true,
        aiScore: true,
        address: true,
        phone: true,
      },
      orderBy: { aiScore: 'desc' }
    });
    res.json(workers);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ── Сохранить push-токен ──────────────────────────────
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

// ── Поставить рейтинг ────────────────────────────────
router.post('/users/:id/rate', rateWorker);

export default router;