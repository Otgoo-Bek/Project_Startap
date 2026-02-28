const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class UserService {
  static async syncUser(userData) {
    const { uid, email, role, name, phone } = userData;

    let user = await prisma.user.upsert({
      where: { uid },
      update: {
        email,
        role,
        name,
        phone,
        updatedAt: new Date()
      },
      create: {
        uid,
        email,
        role,
        name,
        phone,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });

    return user;
  }

  static async toggleHotStatus(userId, isHot) {
    return await prisma.user.update({
      where: { id: userId },
      data: { isHot }
    });
  }
}

module.exports = UserService;