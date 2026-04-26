import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
const prisma = new PrismaClient();

// Создать или найти пользователя
// isLogin=true — только вход (не создавать нового)
export const syncUser = async (data: {
  uid: string;
  email: string;
  role: string;
  name?: string;
  isLogin?: boolean;
}) => {
  const existing = await prisma.user.findUnique({
    where: { email: data.email }
  });

  // ВХОД
  if (data.isLogin) {
    if (!existing) {
      return { error: 'Аккаунт не найден. Сначала зарегистрируйся.' };
    }
    // Проверяем что роль совпадает!
    if (existing.role !== data.role) {
      if (existing.role === 'B2B') {
        return { error: 'Этот аккаунт зарегистрирован как работодатель. Войди через "Найти персонал".' };
      } else {
        return { error: 'Этот аккаунт зарегистрирован как соискатель. Войди через "Я ищу работу".' };
      }
    }
    return existing;
  }

  // РЕГИСТРАЦИЯ
  if (existing) {
    // Email уже занят другой ролью
    if (existing.role !== data.role) {
      return { error: 'Этот email уже используется для другой роли.' };
    }
    return existing;
  }

  return prisma.user.create({
    data: {
      uid: data.uid,
      email: data.email,
      role: data.role,
      name: data.name || '',
      aiScore: 0,
    }
  });
};
// ── Переключить isHot ────────────────────────────────
export const toggleHotStatus = async (uid: string, isHot: boolean) => {
  return prisma.user.updateMany({
    where: { uid },
    data: { isHot }
  });
};

// ── Получить профиль по uid ──────────────────────────
export const getUserByUid = async (uid: string) => {
  return prisma.user.findFirst({ where: { uid } });
};

// ── Получить профиль по ID ───────────────────────────
export const getUserById = async (id: string) => {
  return prisma.user.findUnique({ where: { id } });
};

// ── Обновить профиль по uid ──────────────────────────
export const updateUser = async (uid: string, data: {
  name?: string;
  phone?: string;
  experience?: string;
  address?: string;
}) => {
  return prisma.user.updateMany({
    where: { uid },
    data: {
      name: data.name,
      phone: data.phone,
      experience: data.experience,
      address: data.address,
    }
  });
};

// ── Обновить профиль по ID ───────────────────────────
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// ── Обновить профиль по ID ───────────────────────────
export const updateProfile = async (id: string, data: {
  name?: string;
  experience?: string;
  phone?: string;
  address?: string;
  companyName?: string;
  responsibleName?: string;
  location?: string;
  yearsOnMarket?: number;
  specialties?: string;
  photoUrl?: string;
}) => {
  const client = await pool.connect();
  try {
    await client.query(
      `UPDATE "User" SET
        name = COALESCE($1, name),
        experience = COALESCE($2, experience),
        phone = COALESCE($3, phone),
        address = COALESCE($4, address),
        "companyName" = COALESCE($5, "companyName"),
        "responsibleName" = COALESCE($6, "responsibleName"),
        location = COALESCE($7, location),
        "yearsOnMarket" = COALESCE($8, "yearsOnMarket"),
        specialties = COALESCE($9, specialties),
        "photoUrl" = COALESCE($10, "photoUrl"),
        "updatedAt" = NOW()
      WHERE id = $11`,
      [
        data.name || null,
        data.experience || null,
        data.phone || null,
        data.address || null,
        data.companyName || null,
        data.responsibleName || null,
        data.location || null,
        data.yearsOnMarket || null,
        data.specialties || null,
        data.photoUrl || null,
        id
      ]
    );
    const { rows } = await client.query(
      `SELECT * FROM "User" WHERE id = $1`, [id]
    );
    return rows[0];
  } finally {
    client.release();
  }
};
// ── Поставить рейтинг (правильная формула среднего) ──
export const rateUser = async (seekerId: string, stars: number) => {
  const user = await prisma.user.findUnique({ where: { id: seekerId } });
  if (!user) throw new Error('Пользователь не найден');

  const currentScore = user.aiScore ?? 80;
  const currentCount = (user as any).ratingCount ?? 0;

  // (старый score * кол-во + новая оценка * 20) / (кол-во + 1)
  const newCount = currentCount + 1;
  const newScore = Math.round(
    ((currentScore * currentCount) + (stars * 20)) / newCount
  );
  const clamped = Math.min(100, Math.max(0, newScore));

  console.log(
    `[RATING] ${user.name}: ${currentScore}→${clamped} ` +
    `(оценок: ${currentCount}→${newCount}, звёзд: ${stars})`
  );
  return prisma.user.update({
    where: { id: seekerId },
    data: {
      aiScore: clamped,
      ratingCount: newCount,
    } as any,
  });
};

// ── Статистика соискателя ────────────────────────────
export const getWorkerStats = async (seekerId: string) => {
  const totalShifts = await prisma.application.count({
    where: { seekerId, status: 'APPROVED' }
  });
  const totalApplied = await prisma.application.count({
    where: { seekerId }
  });
  return { totalShifts, totalApplied };
};