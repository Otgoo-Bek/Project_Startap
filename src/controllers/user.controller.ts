import { Request, Response } from 'express';
import * as UserService from '../services/user.service';

// POST /users/sync
export const syncUser = async (req: Request, res: Response) => {
  try {
    const user = await UserService.syncUser(req.body);
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
    const result = await UserService.toggleHotStatus(uid, isHot);
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
};

// GET /users/me
export const getMe = async (req: Request, res: Response) => {
  try {
    const uid = req.headers['x-uid'] as string;
    if (!uid) return res.status(400).json({ error: 'Передай x-uid в заголовке' });
    const user = await UserService.getUserByUid(uid);
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
    if (!uid) return res.status(400).json({ error: 'Передай x-uid в заголовке' });
    await UserService.updateUser(uid, req.body);
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
};