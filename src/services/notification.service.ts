import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// Отправить push через Expo Push API (бесплатно, без Firebase)
const sendExpoPush = async (
  pushToken: string,
  title: string,
  body: string,
  data?: object
) => {
  if (!pushToken?.startsWith('ExponentPushToken')) {
    console.log(`[PUSH] Пропуск — невалидный токен: ${pushToken?.slice(0, 20)}`);
    return;
  }

  try {
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip, deflate',
      },
      body: JSON.stringify({
        to: pushToken,
        sound: 'default',
        title,
        body,
        data: data || {},
        priority: 'high',
      }),
    });
    const result = await response.json();
    console.log(`[PUSH] ✅ Отправлено: "${title}" → ${result?.data?.status}`);
  } catch (e) {
    console.error('[PUSH] ❌ Ошибка:', e);
  }
};

// ── Сценарий А: Горящая смена ────────────────────────
// При создании смены — пуш всем isHot=true соискателям
export const sendPushToHotUsers = async (shift: any) => {
  const hotUsers = await prisma.user.findMany({
    where: {
      role: 'B2C',
      isHot: true,
      pushToken: { not: null }
    }
  });

  console.log(`[PUSH] Горящая смена → ${hotUsers.length} кандидатов`);

  const promises = hotUsers
    .filter(u => u.pushToken)
    .map(u => sendExpoPush(
      u.pushToken!,
      `[!] Новая смена: ${shift.role} в ${shift.establishment}!`,
      `${shift.pay}₽ · ${shift.address}`,
      { shiftId: shift.id, type: 'new_shift' }
    ));

  await Promise.allSettled(promises);
};

// ── Сценарий Б: Новый отклик ─────────────────────────
// При отклике — пуш работодателю
export const sendPushToEmployer = async (creatorId: string, message: string) => {
  const employer = await prisma.user.findUnique({ where: { id: creatorId } });
  if (!employer?.pushToken) {
    console.log(`[PUSH] Работодатель ${creatorId} — нет токена`);
    return;
  }
  await sendExpoPush(
    employer.pushToken,
    '👤 Новый кандидат!',
    message,
    { type: 'new_applicant' }
  );
};

// ── Пуш соискателю (принят / смена завершена) ────────
export const sendPushToSeeker = async (seekerId: string, message: string) => {
  const seeker = await prisma.user.findUnique({ where: { id: seekerId } });
  if (!seeker?.pushToken) {
    console.log(`[PUSH] Соискатель ${seekerId} — нет токена`);
    return;
  }
  await sendExpoPush(
    seeker.pushToken,
    'ASAP WORK',
    message,
    { type: 'shift_update' }
  );
};