import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const sendExpoPush = async (
  pushToken: string,
  title: string,
  body: string,
  data?: object
): Promise<void> => {
  if (!pushToken?.startsWith('ExponentPushToken')) {
    console.log(`[PUSH] Пропуск — невалидный токен`);
    return;
  }
  try {
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
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
    const result = await response.json() as { data?: { status?: string } };
    console.log(`[PUSH] ✅ "${title}" → ${result?.data?.status || 'sent'}`);
  } catch (e) {
    console.error('[PUSH] ❌ Ошибка:', e);
  }
};

// ── ИИ-подбор соискателей для смены ─────────────────
const matchSeekers = (seekers: any[], shift: any): any[] => {
  const shiftRole = (shift.role || '').toLowerCase();
  const shiftDate = shift.startTime ? new Date(shift.startTime) : null;
  const isToday = shiftDate
    ? shiftDate.toDateString() === new Date().toDateString()
    : false;

  // Ключевые слова по специальностям
  const roleKeywords: Record<string, string[]> = {
    'бариста': ['бариста', 'кофе', 'кафе', 'barista'],
    'официант': ['официант', 'сервис', 'зал', 'ресторан'],
    'повар': ['повар', 'кухня', 'готовить', 'шеф'],
    'грузчик': ['грузчик', 'погрузка', 'склад', 'грузы'],
    'монтажник': ['монтажник', 'монтаж', 'установка', 'сборка'],
    'уборщик': ['уборщик', 'уборка', 'клининг', 'чистота'],
    'охранник': ['охранник', 'охрана', 'безопасность'],
    'промоутер': ['промоутер', 'промо', 'реклама'],
  };

  return seekers.filter(seeker => {
    // Базовый фильтр — есть pushToken
    if (!seeker.pushToken) return false;

    const experience = (seeker.experience || '').toLowerCase();
    const specialties = (seeker.specialties || '').toLowerCase();
    const seekerData = `${experience} ${specialties}`;

    // Проверяем совпадение по специальности
    let roleMatch = false;

    // Прямое совпадение
    if (seekerData.includes(shiftRole)) {
      roleMatch = true;
    }

    // Совпадение по ключевым словам
    if (!roleMatch) {
      for (const [key, keywords] of Object.entries(roleKeywords)) {
        if (shiftRole.includes(key) || keywords.some(k => shiftRole.includes(k))) {
          if (keywords.some(k => seekerData.includes(k))) {
            roleMatch = true;
            break;
          }
        }
      }
    }

    // Если нет опыта указан — всё равно отправляем (новички)
    const hasNoExperience = !seeker.experience && !seeker.specialties;

    // Для смен "сегодня" — приоритет горячим (isHot)
    if (isToday && !seeker.isHot && !roleMatch && !hasNoExperience) {
      return false;
    }

    return roleMatch || hasNoExperience || seeker.isHot;
  });
};

// ── При создании смены → ИИ подбирает соискателей ───
export const sendPushToHotUsers = async (shift: any): Promise<void> => {
  const allSeekers = await prisma.user.findMany({
    where: {
      role: 'B2C',
      pushToken: { not: null }
    }
  });

  const matched = matchSeekers(allSeekers, shift);

  console.log(`[PUSH] ИИ подобрал ${matched.length} из ${allSeekers.length} соискателей для "${shift.role}"`);

  const shiftDate = shift.startTime ? new Date(shift.startTime) : null;
  const isToday = shiftDate
    ? shiftDate.toDateString() === new Date().toDateString()
    : false;

  const urgencyPrefix = isToday ? '🔥 СЕГОДНЯ! ' : '⚡ ';

  const promises = matched.map(u => sendExpoPush(
    u.pushToken!,
    `${urgencyPrefix}Новая смена: ${shift.role}`,
    `${shift.pay?.toLocaleString()}₽ · ${shift.establishment} · ${shift.address}`,
    { shiftId: shift.id, type: 'new_shift' }
  ));

  await Promise.allSettled(promises);
};

// ── При регистрации → приветственный пуш ────────────
export const sendWelcomePush = async (
  userId: string,
  name: string,
  role: string
): Promise<void> => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.pushToken) return;

  const isB2C = role === 'B2C';
  await sendExpoPush(
    user.pushToken,
    `👋 Добро пожаловать, ${name || 'в МигРабота'}!`,
    isB2C
      ? 'Найди подработку рядом с тобой прямо сейчас!'
      : 'Создай первую смену и найди персонал за минуты!',
    { type: 'welcome' }
  );
};

// ── При отклике → пуш работодателю ──────────────────
export const sendPushToEmployer = async (
  creatorId: string,
  message: string
): Promise<void> => {
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

// ── Пуш соискателю ───────────────────────────────────
export const sendPushToSeeker = async (
  seekerId: string,
  message: string
): Promise<void> => {
  const seeker = await prisma.user.findUnique({ where: { id: seekerId } });
  if (!seeker?.pushToken) {
    console.log(`[PUSH] Соискатель ${seekerId} — нет токена`);
    return;
  }
  await sendExpoPush(
    seeker.pushToken,
    'МигРабота',
    message,
    { type: 'shift_update' }
  );
};