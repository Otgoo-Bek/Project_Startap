// Сервис уведомлений
// TODO: заменить console.log на реальный FCM когда будут ключи

export const sendPushToHotUsers = async (shift: any) => {
  try {
    // В будущем: найти всех isHot=true и отправить FCM push
    console.log(`[PUSH] Новая смена: ${shift.role} в ${shift.establishment} — ${shift.pay}₽`);
    console.log('[PUSH] Уведомление было бы отправлено всем горячим кандидатам');
    return { sent: true, message: 'Уведомления отправлены (stub)' };
  } catch (e) {
    console.error('[PUSH ERROR]', e);
  }
};

export const sendPushToEmployer = async (employerId: string, seekerName: string) => {
  try {
    console.log(`[PUSH] Работодателю ${employerId}: новый кандидат ${seekerName}!`);
    return { sent: true };
  } catch (e) {
    console.error('[PUSH ERROR]', e);
  }
};