class NotificationService {
  static async sendPushToHotUsers(shift) {
    console.log('🔔 [ЗАГЛУШКА] Отправка пуша горячим пользователям:');
    console.log(`   Смена: ${shift.role} в "${shift.establishment}"`);
    console.log(`   Время: ${shift.startTime}`);
    console.log(`   Оплата: ${shift.pay} ₽`);
    console.log('   Получатели: все пользователи с isHot=true');
    return { success: true, message: 'Push notification queued for hot users' };
  }
}

module.exports = NotificationService;