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
import { Pool } from 'pg';
import * as crypto from 'crypto';
 
const router = Router();
const prisma = new PrismaClient();
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});
 
// Простое хэширование пароля (SHA-256)
const hashPassword = (password: string): string => {
  return crypto.createHash('sha256').update(password).digest('hex');
};
 
// ── Авторизация / Регистрация с паролем ──────────────
router.post('/users/auth', async (req, res) => {
  const client = await pool.connect();
  try {
    const { email, password, role, isLogin } = req.body;
 
    if (!email || !password) {
      return res.status(400).json({ error: 'Email и пароль обязательны' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Пароль должен быть не менее 6 символов' });
    }
 
    const hashed = hashPassword(password);
 
    // Ищем пользователя по email
    const { rows } = await client.query(
      `SELECT id, email, role, password FROM "User" WHERE email = $1 LIMIT 1`,
      [email.toLowerCase()]
    );
 
    if (isLogin) {
      // ВХОД — пользователь должен существовать
      if (!rows.length) {
        return res.status(404).json({ error: 'Аккаунт не найден. Сначала зарегистрируйся.' });
      }
      const user = rows[0];
 
      // Проверяем роль
      if (user.role !== role) {
        const roleMsg = user.role === 'B2B'
          ? 'Этот аккаунт зарегистрирован как работодатель. Войди через "Найти персонал".'
          : 'Этот аккаунт зарегистрирован как соискатель. Войди через "Я ищу работу".';
        return res.status(403).json({ error: roleMsg });
      }
 
      // Если пароль ещё не установлен (старые аккаунты) — сохраняем и пропускаем
      if (!user.password) {
        await client.query(
          `UPDATE "User" SET password = $1 WHERE id = $2`,
          [hashed, user.id]
        );
        return res.json({ success: true, message: 'Пароль установлен' });
      }
 
      // Проверяем пароль
      if (user.password !== hashed) {
        return res.status(401).json({ error: 'Неверный пароль' });
      }
 
      return res.json({ success: true });
 
    } else {
      // РЕГИСТРАЦИЯ — пользователь не должен существовать с другой ролью
      if (rows.length) {
        const existing = rows[0];
        if (existing.role !== role) {
          return res.status(409).json({ error: 'Этот email уже используется для другой роли.' });
        }
        // Уже зарегистрирован с той же ролью — просто обновим пароль если нет
        if (!existing.password) {
          await client.query(
            `UPDATE "User" SET password = $1 WHERE id = $2`,
            [hashed, existing.id]
          );
        }
        return res.json({ success: true });
      }
 
      // Новый пользователь — пароль будет сохранён при создании через /users/sync
      // Здесь только проверяем что email свободен и сохраняем временно пароль
      // Пароль сохраним после создания пользователя
      // Возвращаем хэш чтобы sync мог его использовать
      return res.json({ success: true, passwordHash: hashed });
    }
 
  } catch (e: any) {
    console.error('[AUTH ERROR]', e.message);
    res.status(500).json({ error: e.message });
  } finally {
    client.release();
  }
});
 
// ── Основные (без параметров — должны быть первыми!) ──
router.post('/users/sync', sync);
router.patch('/seeker/status', toggleHot);
router.get('/users/me', getMe);
router.patch('/users/me', patchMe);
 
// ── Список всех пользователей ────────────────────────
router.get('/users', async (req, res) => {
  try {
    const users = await (prisma.user.findMany as any)({
      orderBy: { createdAt: 'desc' },
      take: 50
    });
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
 
// ── Обновить профиль по ID ────────────────────────────
router.patch('/users/:id/profile', updateUserProfile);
 
// ── Поставить рейтинг ─────────────────────────────────
router.post('/users/:id/rate', rateWorker);
 
export default router;