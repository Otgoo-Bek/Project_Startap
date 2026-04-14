import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import {
  syncUser,
  toggleHotStatus,
  getUserByUid,
  updateUser,
  updateProfile,
  getWorkerStats,
} from '../services/user.service';

const prisma = new PrismaClient();

// Прямое подключение к PostgreSQL (обходит Prisma типы)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// POST /users/sync
export const sync = async (req: Request, res: Response) => {
  try {
    const user = await syncUser(req.body);
    res.json(user);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
};

// PATCH /seeker/status
export const toggleHot = async (req: Request, res: Response) => {
  try {
    const { uid, isHot } = req.body;
    if (!uid) return res.status(400).json({ error: 'uid обязателен' });
    const result = await toggleHotStatus(uid, isHot);
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
};

// GET /users/me
export const getMe = async (req: Request, res: Response) => {
  try {
    const uid = req.headers['x-uid'] as string;
    if (!uid) return res.status(400).json({ error: 'Передай x-uid' });
    const user = await getUserByUid(uid);
    if (!user) return res.status(404).json({ error: 'Не найден' });
    res.json(user);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
};

// PATCH /users/me
export const patchMe = async (req: Request, res: Response) => {
  try {
    const uid = req.headers['x-uid'] as string;
    if (!uid) return res.status(400).json({ error: 'Передай x-uid' });
    await updateUser(uid, req.body);
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
};

// GET /users/:id — профиль + статистика через pg
export const getUserProfile = async (req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { rows } = await client.query(
      `SELECT * FROM "User" WHERE id = $1 LIMIT 1`, [id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Не найден' });
    }
    const stats = await getWorkerStats(id);
    res.json({ ...rows[0], ...stats });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  } finally {
    client.release();
  }
};

// PATCH /users/:id/profile
export const updateUserProfile = async (req: Request, res: Response) => {
  try {
    const updated = await updateProfile(req.params.id, req.body);
    res.json(updated);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
};

// POST /users/:id/rate — дробный рейтинг
export const rateWorker = async (req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const stars = Number(req.body.stars);

    if (!stars || stars < 1 || stars > 5) {
      return res.status(400).json({ error: 'stars от 1 до 5' });
    }

    const { rows } = await client.query(
      `SELECT "aiScore", "ratingCount", "name" FROM "User" WHERE id = $1`,
      [id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Не найден' });

    const user = rows[0];
    const currentCount = Number(user.ratingCount) || 0;
    const currentScore = Number(user.aiScore) || 0;
    const newCount = currentCount + 1;

    // Дробная формула: среднее арифметическое звёзд * 20
    // Например: было 4.0 (2 оценки), новая 5.0 → (4.0*2 + 5.0)/3 = 4.33 → 86.7
    const prevAvgStars = currentScore / 20; // обратно в звёзды
    const newAvgStars = ((prevAvgStars * currentCount) + stars) / newCount;
    const newScore = Math.min(100, Math.max(0,
      Math.round(newAvgStars * 20 * 10) / 10 // округление до 1 знака
    ));

    await client.query(
      `UPDATE "User" SET "aiScore" = $1, "ratingCount" = $2 WHERE id = $3`,
      [newScore, newCount, id]
    );

    console.log(`[RATING] ${user.name}: ${currentScore}→${newScore} (${stars}⭐, всего: ${newCount})`);
    res.json({ success: true, newScore, ratingCount: newCount });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  } finally { client.release(); }
};
