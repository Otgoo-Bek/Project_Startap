import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import {
  sync, toggleHot, getMe, patchMe,
  getUserProfile, updateUserProfile, rateWorker,
} from '../controllers/user.controller';
import { Pool } from 'pg';
import * as crypto from 'crypto';

const router = Router();
const prisma = new PrismaClient();
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const hashPassword = (p: string) =>
  crypto.createHash('sha256').update(p).digest('hex');

// ── Авторизация email/пароль (старый метод) ───────────────────
router.post('/users/auth', async (req, res) => {
  const client = await pool.connect();
  try {
    const { email, password, role, isLogin } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: 'Email и пароль обязательны' });
    if (password.length < 6)
      return res.status(400).json({ error: 'Пароль должен быть не менее 6 символов' });

    const hashed = hashPassword(password);
    const { rows } = await client.query(
      `SELECT id, email, role, password FROM "User" WHERE email = $1 LIMIT 1`,
      [email.toLowerCase()]
    );

    if (isLogin) {
      if (!rows.length)
        return res.status(404).json({ error: 'Аккаунт не найден. Сначала зарегистрируйся.' });
      const user = rows[0];
      if (user.role !== role) {
        return res.status(403).json({
          error: user.role === 'B2B'
            ? 'Этот аккаунт зарегистрирован как работодатель.'
            : 'Этот аккаунт зарегистрирован как соискатель.'
        });
      }
      if (!user.password) {
        await client.query(`UPDATE "User" SET password = $1 WHERE id = $2`, [hashed, user.id]);
        return res.json({ success: true });
      }
      if (user.password !== hashed)
        return res.status(401).json({ error: 'Неверный пароль' });
      return res.json({ success: true });
    } else {
      if (rows.length) {
        const existing = rows[0];
        if (existing.role !== role)
          return res.status(409).json({ error: 'Этот email уже используется для другой роли.' });
        if (!existing.password)
          await client.query(`UPDATE "User" SET password = $1 WHERE id = $2`, [hashed, existing.id]);
        return res.json({ success: true });
      }
      return res.json({ success: true, passwordHash: hashed });
    }
  } catch (e: any) {
    console.error('[AUTH ERROR]', e.message);
    res.status(500).json({ error: e.message });
  } finally { client.release(); }
});

// ── Firebase Phone Auth — синхронизация после SMS ─────────────
router.post('/users/phone-sync', async (req, res) => {
  const client = await pool.connect();
  try {
    const { firebaseToken, phone: rawPhone, role, name, webLogin } = req.body;

    let normalizedPhone = rawPhone?.replace(/[\s\-\(\)]/g, '') || '';

    // Верифицируем Firebase токен (только для мобильных)
    if (!webLogin && firebaseToken) {
      try {
        const admin = (await import('../firebase')).default;
        const decoded = await admin.auth().verifyIdToken(firebaseToken);
        normalizedPhone = decoded.phone_number || normalizedPhone;
      } catch (firebaseErr: any) {
        return res.status(401).json({ error: 'Неверный Firebase токен' });
      }
    }

    if (!normalizedPhone || !role)
      return res.status(400).json({ error: 'phone и role обязательны' });

    // Ищем по телефону
    const { rows } = await client.query(
      `SELECT * FROM "User" WHERE phone = $1 LIMIT 1`,
      [normalizedPhone]
    );

    if (rows.length) {
      const existing = rows[0];

      // Проверяем роль
      if (existing.role !== role) {
        return res.status(403).json({
          error: existing.role === 'B2B'
            ? 'Этот номер зарегистрирован как работодатель. Войди через «Найти персонал».'
            : 'Этот номер зарегистрирован как соискатель. Войди через «Я ищу работу».'
        });
      }

      // Обновляем имя если передано
      if (name?.trim()) {
        await client.query(
          `UPDATE "User" SET name = $1 WHERE id = $2`,
          [name.trim(), existing.id]
        );
        existing.name = name.trim();
      }

      return res.json(existing);
    }

    // Создаём нового пользователя
    const uid = (role === 'B2C' ? 'b2c_' : 'b2b_') + normalizedPhone.replace(/\D/g, '');
    const userName = name?.trim() || (role === 'B2C' ? 'Соискатель' : 'Работодатель');

   const fakeEmail = `phone_${normalizedPhone.replace(/\D/g, '')}@migrabota.app`;

  const { rows: created } = await client.query(
    `INSERT INTO "User" (
    id, uid, phone, email, role, name,
    "isHot", "aiScore", "ratingCount",
    balance, earnings, "employerRatingCount"
    ) VALUES ($1,$2,$3,$4,$5,$6, false,0,0,0,0,0)
    ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name
     RETURNING *`,
  [uid, uid, normalizedPhone, fakeEmail, role, userName]
  ); 
    

    return res.status(201).json(created[0]);

  } catch (e: any) {
    console.error('[PHONE SYNC ERROR]', e.message);
    res.status(500).json({ error: e.message });
  } finally { client.release(); }
});

// ── Основные роуты ────────────────────────────────────────────
router.post('/users/sync', sync);
router.patch('/seeker/status', toggleHot);
router.get('/users/me', getMe);
router.patch('/users/me', patchMe);

// ── Все пользователи ──────────────────────────────────────────
router.get('/users', async (req, res) => {
  try {
    const users = await (prisma.user.findMany as any)({
      orderBy: { createdAt: 'desc' }, take: 50
    });
    res.json(users.map((u: any) => ({
      id: u.id, name: u.name, email: u.email, role: u.role,
      aiScore: u.aiScore, ratingCount: u.ratingCount,
      isHot: u.isHot, createdAt: u.createdAt,
    })));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Горячие соискатели ────────────────────────────────────────
router.get('/workers/hot', async (req, res) => {
  try {
    const workers = await prisma.user.findMany({
      where: { role: 'B2C', isHot: true },
      select: {
        id: true, name: true, email: true,
        experience: true, aiScore: true,
        address: true, phone: true,
      },
      orderBy: { aiScore: 'desc' }
    });
    res.json(workers);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Push-токен ────────────────────────────────────────────────
router.patch('/users/:id/push-token', async (req, res) => {
  try {
    const { pushToken } = req.body;
    if (!pushToken) return res.status(400).json({ error: 'pushToken обязателен' });
    await prisma.user.update({ where: { id: req.params.id }, data: { pushToken } });
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Профиль / обновление / рейтинг ───────────────────────────
router.get('/users/:id', getUserProfile);
router.patch('/users/:id/profile', updateUserProfile);
router.post('/users/:id/rate', rateWorker);

export default router;