const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class ShiftService {
  static async getAllShifts() {
    return await prisma.shift.findMany({
      where: { status: 'OPEN' },
      orderBy: { createdAt: 'desc' },
      include: { creator: { select: { name: true, address: true } } }
    });
  }

  static async createShift(shiftData, creatorId) {
    const { role, establishment, address, startTime, pay, description } = shiftData;

    return await prisma.shift.create({
      data: {
        role,
        establishment,
        address,
        startTime: new Date(startTime),
        pay: parseInt(pay),
        description,
        status: 'OPEN',
        creatorId
      }
    });
  }
}

module.exports = ShiftService;