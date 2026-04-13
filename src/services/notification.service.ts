import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// Отправить push через Expo Push API
const sendPush = async (pushToken: string, title: string, body: string) => {
  if (!pushToken || !pushToken.startsWith('ExponentPushToken')) return;

  const message = { to: pushToken, sound: 'default', title, body };
  await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(message),
  });
  console.log(`[PUSH] Отправлено: ${title} → ${pushToken.slice(0, 30)}...`);
};

// 1. Уведомить всех горячих кандидатов о новой смене
export const sendPushToHotUsers = async (shift: any) => {
  const hotUsers = await prisma.user.findMany({
    where: { role: 'B2C', isHot: true, pushToken: { not: null } }
  });

  console.log(`[PUSH] Горячих кандидатов: ${hotUsers.length}`);

  for (const user of hotUsers) {
    if (user.pushToken) {
      await sendPush(
        user.pushToken,
        '⚡ Новая горящая смена!',
        `${shift.role} в ${shift.establishment} — ${shift.pay}₽`
      );
    }
  }
};

// 2. Уведомить работодателя что кто-то откликнулся
export const sendPushToEmployer = async (creatorId: string, seekerName: string) => {
  const employer = await prisma.user.findUnique({ where: { id: creatorId } });
  if (!employer?.pushToken) return;

  await sendPush(
    employer.pushToken,
    '👤 Новый кандидат!',
    `${seekerName} хочет выйти на смену`
  );
};

// 3. Уведомить соискателя что его приняли
export const sendPushToSeeker = async (seekerId: string, shiftRole: string) => {
  const seeker = await prisma.user.findUnique({ where: { id: seekerId } });
  if (!seeker?.pushToken) return;

  await sendPush(
    seeker.pushToken,
    '✅ Вас приняли на смену!',
    `Работодатель утвердил вас на позицию "${shiftRole}"`
  );
};