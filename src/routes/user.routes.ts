import { Router } from 'express';
import { userController } from '../controllers/user.controller';

const router = Router();

// POST /users/sync - Синхронизация при входе
router.post('/sync', userController.syncUser);

// GET /users/me - Получить профиль текущего пользователя
router.get('/me', userController.getProfile);

// PATCH /users/me - Обновить профиль
router.patch('/me', userController.updateProfile);

// PATCH /users/push-token - Сохранить push токен устройства
router.patch('/push-token', userController.updatePushToken);

// PATCH /users/seeker/status - Только B2C: переключить тумблер isHot
router.patch('/seeker/status', userController.toggleHotStatus);

export default router;
