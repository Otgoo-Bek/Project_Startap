import { Request, Response } from 'express';
import { PrismaClient, Prisma } from '@prisma/client';
import {
  syncUser,
  toggleHotStatus,
  getUserByUid,
  updateUser,
  updateProfile,
  getWorkerStats,
} from '../services/user.service';

const prisma = new PrismaClient();

// ── Хелпер: raw SQL запрос с типом ───────────────────
async function queryRaw(sql: Prisma.Sql){
  const result = await prisma.$queryRaw(sql);
  return result as any[];
}

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

// GET /users/:id — профиль + статистика
export const getUserProfile = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const rows = await queryRaw(
      Prisma.sql`SELECT * FROM "User" WHERE id = ${id}::uuid LIMIT 1`
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Не найден' });
    }
    const stats = await getWorkerStats(id);
    res.json({ ...rows[0], ...stats });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
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

// POST /users/:id/rate — поставить рейтинг через RAW SQL
export const rateWorker = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const stars = Number(req.body.stars);

    if (!stars || stars < 1 || stars > 5) {
      return res.status(400).json({ error: 'stars должен быть от 1 до 5' });
    }

    // Получить текущие значения
    const rows = await queryRaw(
      Prisma.sql`
        SELECT "aiScore", "ratingCount", "name"
        FROM "User" WHERE id = ${id}::uuid LIMIT 1
      `
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    const user = rows[0];
    const currentScore = Number(user.aiScore) || 0;
    const currentCount = Number(user.ratingCount) || 0;
    const newCount = currentCount + 1;
    const newScore = Math.min(100, Math.max(0,
      Math.round(((currentScore * currentCount) + (stars * 20)) / newCount)
    ));

    // Обновить через raw SQL
    await prisma.$executeRaw(
      Prisma.sql`
        UPDATE "User"
        SET "aiScore" = ${newScore}, "ratingCount" = ${newCount}
        WHERE id = ${id}::uuid
      `
    );

    console.log(`[RATING] ${user.name}: ${currentScore}→${newScore} (${stars}⭐)`);

    res.json({ success: true, newScore, ratingCount: newCount });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
};