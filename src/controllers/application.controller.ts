import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import {
  sendPushToEmployer,
  sendPushToSeeker,
  sendPushToHotUsers,
} from '../services/notification.service';

const prisma = new PrismaClient();

// POST /shifts/:id/apply — откликнуться
export const apply = async (req: Request, res: Response) => {
  try {
    const { id: shiftId } = req.params;
    const { seekerId } = req.body;
    if (!seekerId) return res.status(400).json({ error: 'seekerId обязателен' });

    const application = await prisma.application.create({
      data: { shiftId, seekerId }
    });

    // Сценарий Б: Push работодателю — "Новый кандидат"
    const shift = await prisma.shift.findUnique({ where: { id: shiftId } });
    const seeker = await prisma.user.findUnique({ where: { id: seekerId } });
    if (shift && seeker) {
      await sendPushToEmployer(
        shift.creatorId,
        `Новый кандидат: ${seeker.name || 'Соискатель'} хочет выйти на смену!`
      );
    }

    res.status(201).json(application);
  } catch (e: any) {
    if (e.code === 'P2002') return res.status(409).json({ error: 'Уже откликался' });
    res.status(500).json({ error: e.message });
  }
};

// GET /shifts/:id/applicants — кандидаты
export const getApplicants = async (req: Request, res: Response) => {
  try {
    const applicants = await prisma.application.findMany({
      where: { shiftId: req.params.id },
      include: { seeker: true },
      orderBy: { seeker: { aiScore: 'desc' } }
    });
    res.json(applicants);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
};

// POST /applications/:id/accept — принять
export const accept = async (req: Request, res: Response) => {
  try {
    const application = await prisma.application.update({
      where: { id: req.params.id },
      data: { status: 'APPROVED' },
      include: { shift: true, seeker: true }
    });

    // Push соискателю: "Вас приняли!"
    await sendPushToSeeker(
      application.seekerId,
      `✅ Вас приняли на смену "${application.shift.role}" в ${application.shift.establishment}!`
    );

    res.json(application);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
};

// POST /applications/:id/complete — завершить смену
export const complete = async (req: Request, res: Response) => {
  try {
    const application = await prisma.application.update({
      where: { id: req.params.id },
      data: { status: 'COMPLETED' },
      include: { shift: true, seeker: true }
    });

    // Закрыть саму смену
    await prisma.shift.update({
      where: { id: application.shiftId },
      data: { status: 'COMPLETED' }
    });

    // Push соискателю: "Смена завершена"
    await sendPushToSeeker(
      application.seekerId,
      `🏁 Смена "${application.shift.role}" завершена. Работодатель скоро оценит вас!`
    );

    res.json({ success: true, application });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
};

// POST /applications/:id/rate — оценить с комментарием
export const rateApplication = async (req: Request, res: Response) => {
  try {
    const { stars, comment } = req.body;
    if (!stars || stars < 1 || stars > 5) {
      return res.status(400).json({ error: 'stars должен быть от 1 до 5' });
    }

    // Сначала получаем application с seeker
    const existing = await prisma.application.findUnique({
      where: { id: req.params.id },
      include: { seeker: true }
    }) as any;

    if (!existing) return res.status(404).json({ error: 'Не найдено' });

    // Сохранить оценку и комментарий (as any — до миграции)
    await (prisma.application.update as any)({
      where: { id: req.params.id },
      data: { rating: stars, comment: comment || null }
    });

    // Пересчитать aiScore соискателя
    const seeker = existing.seeker;
    const currentScore: number = seeker.aiScore ?? 0;
    const currentCount: number = (seeker as any).ratingCount ?? 0;
    const newCount = currentCount + 1;
    const newScore = Math.round(
      ((currentScore * currentCount) + (stars * 20)) / newCount
    );
    const clamped = Math.min(100, Math.max(0, newScore));

    await (prisma.user.update as any)({
      where: { id: seeker.id },
      data: { aiScore: clamped, ratingCount: newCount }
    });

    console.log(`[RATING] ${seeker.name}: ${currentScore}→${clamped} (${stars}⭐)`);

    res.json({ success: true, newScore: clamped, comment });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
};