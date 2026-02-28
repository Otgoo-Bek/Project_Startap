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
    // Для демо используем первого пользователя
    const users = await prisma.user.findMany();
    if (users.length === 0) throw new Error('No users found');
    
    return await prisma.user.update({
      where: { id: users[0].id },
      data: { isHot }
    });
  }

  static async getAllUsers() {
    return await prisma.user.findMany();
  }
}

module.exports = UserService;