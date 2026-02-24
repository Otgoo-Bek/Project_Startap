import { Request, Response } from 'express';
import { userService } from '../services/user.service';
import { UserRole } from '../types';

export const userController = {
  // POST /users/sync - Синхронизация при входе
  async syncUser(req: Request, res: Response) {
    try {
      const { uid, email, role, name } = req.body;
      
      console.log(`[UserController] Sync request:`, { uid, email, role, name });
      
      // Валидация
      if (!uid || !email || !role) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields',
          required: ['uid', 'email', 'role'],
          received: { uid, email, role }
        });
      }
      
      if (!['B2B', 'B2C'].includes(role)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid role',
          allowed: ['B2B', 'B2C'],
          received: role
        });
      }
      
      const result = await userService.syncUser(uid, email, role as UserRole, name);
      
      res.json({
        success: true,
        user: result.user,
        isNew: result.isNew,
        message: result.isNew ? 'User created successfully' : 'User synchronized'
      });
      
    } catch (error: any) {
      console.error('[UserController] Sync error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },
  
  // GET /users/me - Получить профиль
  async getProfile(req: Request, res: Response) {
    try {
      // TODO: Заменить на реальный ID из middleware аутентификации
      const mockUserId = 'b2c-456'; // Используем существующего мок-пользователя
      
      console.log(`[UserController] Get profile for user: ${mockUserId}`);
      
      const user = await userService.getUserById(mockUserId);
      
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }
      
      // Не отправляем pushToken в ответе
      const { pushToken, ...safeUser } = user;
      
      res.json({
        success: true,
        user: safeUser
      });
      
    } catch (error: any) {
      console.error('[UserController] Get profile error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  },
  
  // PATCH /users/me - Обновить профиль
  async updateProfile(req: Request, res: Response) {
    try {
      const mockUserId = 'b2c-456';
      const updates = req.body;
      
      console.log(`[UserController] Update profile for user: ${mockUserId}`, updates);
      
      // Валидация полей которые можно обновлять
      const allowedFields = ['name', 'phone', 'address', 'experience'];
      const invalidFields = Object.keys(updates).filter(
        field => !allowedFields.includes(field)
      );
      
      if (invalidFields.length > 0) {
        return res.status(400).json({
          success: false,
          error: 'Invalid fields in update',
          invalidFields,
          allowedFields
        });
      }
      
      const updatedUser = await userService.updateProfile(mockUserId, updates);
      
      if (!updatedUser) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }
      
      res.json({
        success: true,
        user: updatedUser,
        message: 'Profile updated successfully'
      });
      
    } catch (error: any) {
      console.error('[UserController] Update profile error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  },
  
  // PATCH /users/push-token - Сохранить push токен
  async updatePushToken(req: Request, res: Response) {
    try {
      const mockUserId = 'b2c-456';
      const { pushToken } = req.body;
      
      console.log(`[UserController] Update push token for user: ${mockUserId}`);
      
      if (!pushToken) {
        return res.status(400).json({
          success: false,
          error: 'pushToken is required'
        });
      }
      
      const updatedUser = await userService.updatePushToken(mockUserId, pushToken);
      
      if (!updatedUser) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }
      
      res.json({
        success: true,
        message: 'Push token updated successfully'
      });
      
    } catch (error: any) {
      console.error('[UserController] Update push token error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  },
  
  // PATCH /users/seeker/status - Только для B2C: переключить isHot
  async toggleHotStatus(req: Request, res: Response) {
    try {
      const mockUserId = 'b2c-456';
      const { isHot } = req.body;
      
      console.log(`[UserController] Toggle hot status for user: ${mockUserId}, isHot: ${isHot}`);
      
      if (typeof isHot !== 'boolean') {
        return res.status(400).json({
          success: false,
          error: 'isHot must be a boolean',
          received: typeof isHot
        });
      }
      
      // Проверяем что пользователь B2C
      const user = await userService.getUserById(mockUserId);
      
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }
      
      if (user.role !== 'B2C') {
        return res.status(403).json({
          success: false,
          error: 'This endpoint is only available for B2C users',
          userRole: user.role
        });
      }
      
      const updatedUser = await userService.toggleHotStatus(mockUserId, isHot);
      
      res.json({
        success: true,
        user: updatedUser,
        message: `Hot status changed to ${isHot}`
      });
      
    } catch (error: any) {
      console.error('[UserController] Toggle hot status error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        details: error.message
      });
    }
  }
};
