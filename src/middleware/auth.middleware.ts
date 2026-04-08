import { Request, Response, NextFunction } from 'express';

// Middleware: проверяет наличие токена в заголовке
export const authMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers['authorization'];

  if (!authHeader) {
    return res.status(401).json({
      error: 'Нет токена авторизации'
    });
  }

  // Извлекаем uid из заголовка (формат: "Bearer <uid>")
  const uid = authHeader.replace('Bearer ', '');
  (req as any).uid = uid; // добавляем uid в request
  next();
};