import { User, UserRole } from '../types';

// Мок-данные для разработки (временные)
const mockUsers: User[] = [
  {
    id: 'b2b-123',
    email: 'restaurant@example.com',
    role: 'B2B',
    name: 'Ресторан "Уют"',
    phone: '+79991234567',
    address: 'ул. Примерная, 1',
    isHot: false,
    aiScore: 0,
    createdAt: new Date('2024-01-01')
  },
  {
    id: 'b2c-456',
    email: 'worker@example.com',
    role: 'B2C',
    name: 'Иван Петров',
    phone: '+79998765432',
    experience: 'Официант 2 года, бариста 1 год',
    isHot: true,
    aiScore: 85,
    pushToken: 'exponent-push-token-abc123',
    createdAt: new Date('2024-01-02')
  }
];

export const userService = {
  // Синхронизация пользователя (POST /users/sync)
  async syncUser(uid: string, email: string, role: UserRole, name?: string) {
    console.log(`[UserService] Syncing user: ${email}, role: ${role}`);
    
    // Ищем пользователя по email
    let user = mockUsers.find(u => u.email === email);
    let isNew = false;
    
    if (user) {
      console.log(`[UserService] User found: ${user.id}`);
      // Обновляем UID если нужно
      if (user.id !== uid) {
        user.id = uid;
      }
    } else {
      // Создаем нового пользователя
      console.log(`[UserService] Creating new user: ${email}`);
      const newUser: User = {
        id: uid,
        email,
        role,
        name: name || '',
        isHot: role === 'B2C' ? false : undefined,
        aiScore: role === 'B2C' ? 80 : 0,
        createdAt: new Date()
      };
      
      mockUsers.push(newUser);
      user = newUser;
      isNew = true;
    }
    
    return {
      user: { ...user },
      isNew
    };
  },
  
  // Получить пользователя по ID (GET /users/me)
  async getUserById(id: string) {
    const user = mockUsers.find(u => u.id === id);
    if (user) {
      return { ...user };
    }
    return null;
  },
  
  // Обновить профиль (PATCH /users/me)
  async updateProfile(id: string, updates: Partial<User>) {
    const index = mockUsers.findIndex(u => u.id === id);
    if (index === -1) return null;
    
    // Разрешаем обновлять только определенные поля
    const allowedFields = ['name', 'phone', 'address', 'experience'];
    const filteredUpdates: Partial<User> = {};
    
    Object.keys(updates).forEach(key => {
      if (allowedFields.includes(key)) {
        filteredUpdates[key as keyof User] = updates[key as keyof User];
      }
    });
    
    mockUsers[index] = { ...mockUsers[index], ...filteredUpdates };
    return { ...mockUsers[index] };
  },
  
  // Обновить push токен (PATCH /users/push-token)
  async updatePushToken(id: string, pushToken: string) {
    const index = mockUsers.findIndex(u => u.id === id);
    if (index === -1) return null;
    
    mockUsers[index].pushToken = pushToken;
    return { ...mockUsers[index] };
  },
  
  // Переключить статус isHot (PATCH /seeker/status)
  async toggleHotStatus(id: string, isHot: boolean) {
    const index = mockUsers.findIndex(u => u.id === id);
    if (index === -1) return null;
    
    if (mockUsers[index].role !== 'B2C') {
      throw new Error('Only B2C users can toggle hot status');
    }
    
    mockUsers[index].isHot = isHot;
    return { ...mockUsers[index] };
  },
  
  // Вспомогательные методы (для отладки)
  getAllUsers() {
    return [...mockUsers];
  },
  
  // Получить всех "горячих" пользователей (для уведомлений)
  getHotUsers() {
    return mockUsers.filter(u => u.role === 'B2C' && u.isHot && u.pushToken);
  }
};
