import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ── Создать или найти пользователя ───────────────────
export const syncUser = async (data: {
  uid: string;
  email: string;
  role: string;
  name?: string;
}) => {
  const existing = await prisma.user.findUnique({
    where: { email: data.email }
  });
  if (existing) return existing;
  return prisma.user.create({ data });
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
export const updateProfile = async (id: string, data: {
  name?: string;
  experience?: string;
  phone?: string;
  address?: string;
}) => {
  return prisma.user.update({
    where: { id },
    data,
  });
};

// ── Поставить рейтинг (обновить aiScore) ─────────────
export const rateUser = async (seekerId: string, stars: number) => {
  const user = await prisma.user.findUnique({ where: { id: seekerId } });
  if (!user) throw new Error('Пользователь не найден');
  // Формула: 70% старый score + 30% новый рейтинг (звёзды * 20)
  const newScore = Math.round((user.aiScore * 0.7) + (stars * 20 * 0.3));
  const clamped = Math.min(100, Math.max(0, newScore));
  return prisma.user.update({
    where: { id: seekerId },
    data: { aiScore: clamped },
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