import { Request, Response } from 'express';
import {
  syncUser,
  toggleHotStatus,
  getUserByUid,
  getUserById,
  updateUser,
  updateProfile,
  rateUser,
  getWorkerStats,
} from '../services/user.service';

// POST /users/sync — создать или найти пользователя
export const sync = async (req: Request, res: Response) => {
  try {
    const user = await syncUser(req.body);
    res.json(user);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
};

// PATCH /seeker/status — переключить тумблер isHot
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

// GET /users/me — получить свой профиль по uid из заголовка
export const getMe = async (req: Request, res: Response) => {
  try {
    const uid = req.headers['x-uid'] as string;
    if (!uid) return res.status(400).json({ error: 'Передай x-uid в заголовке' });
    const user = await getUserByUid(uid);
    if (!user) return res.status(404).json({ error: 'Не найден' });
    res.json(user);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
};

// PATCH /users/me — обновить свой профиль
export const patchMe = async (req: Request, res: Response) => {
  try {
    const uid = req.headers['x-uid'] as string;
    if (!uid) return res.status(400).json({ error: 'Передай x-uid в заголовке' });
    await updateUser(uid, req.body);
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
};

// GET /users/:id — получить профиль любого пользователя по ID
export const getUserProfile = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = await getUserById(id);
    if (!user) return res.status(404).json({ error: 'Пользователь не найден' });
    // Добавляем статистику смен
    const stats = await getWorkerStats(id);
    res.json({ ...user, ...stats });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
};

// PATCH /users/:id/profile — обновить профиль по ID
export const updateUserProfile = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updated = await updateProfile(id, req.body);
    res.json(updated);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
};

// POST /users/:id/rate — поставить рейтинг соискателю
export const rateWorker = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { stars } = req.body;
    if (!stars || stars < 1 || stars > 5) {
      return res.status(400).json({ error: 'stars должен быть от 1 до 5' });
    }
    const updated = await rateUser(id, Number(stars));
    res.json({ success: true, newScore: updated.aiScore });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
};