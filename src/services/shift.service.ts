import { PrismaClient } from '@prisma/client';
import { CreateShiftDto } from '../types';

const prisma = new PrismaClient();

export const getAllShifts = async () => {
  return prisma.shift.findMany({
    where: { status: 'OPEN' },
    orderBy: { createdAt: 'desc' }
  });
};

export const createShift = async (data: CreateShiftDto) => {
  return prisma.shift.create({
    data: {
      role: data.role,
      establishment: data.establishment,
      address: data.address,
      startTime: new Date(data.startTime),
      pay: Number(data.pay),
      description: data.description,
      creatorId: data.creatorId,
    }
  });
};