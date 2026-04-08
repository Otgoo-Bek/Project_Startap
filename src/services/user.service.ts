import { PrismaClient } from '@prisma/client';
import { CreateUserDto, UpdateUserDto } from '../types';

const prisma = new PrismaClient();

// Создать или найти пользователя
export const syncUser = async (data: CreateUserDto) => {
  const existing = await prisma.user.findUnique({
    where: { email: data.email }
  });
  if (existing) return existing;
  return prisma.user.create({ data });
};

// Переключить isHot
export const toggleHotStatus = async (uid: string, isHot: boolean) => {
  return prisma.user.updateMany({
    where: { uid },
    data: { isHot }
  });
};

// Получить профиль по uid
export const getUserByUid = async (uid: string) => {
  return prisma.user.findFirst({ where: { uid } });
};

// Обновить профиль
export const updateUser = async (uid: string, data: UpdateUserDto) => {
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