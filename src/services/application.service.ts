import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// Соискатель откликается на смену
export const applyToShift = async (shiftId: string, seekerId: string) => {
  return prisma.application.create({
    data: { shiftId, seekerId }
  });
};

// Получить список кандидатов на смену (сортировка по aiScore)
export const getApplicants = async (shiftId: string) => {
  return prisma.application.findMany({
    where: { shiftId },
    include: {
      seeker: true  // подтянуть данные соискателя
    },
    orderBy: {
      seeker: { aiScore: 'desc' }  // лучшие сверху
    }
  });
};

// Работодатель принимает кандидата
export const acceptApplication = async (applicationId: string) => {
  return prisma.application.update({
    where: { id: applicationId },
    data: { status: 'APPROVED' }
  });
};