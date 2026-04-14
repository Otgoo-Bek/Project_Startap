import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import {
  sendPushToEmployer,
  sendPushToSeeker,
  sendPushToHotUsers,
} from '../services/notification.service';

const prisma = new PrismaClient();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// POST /shifts/:id/apply — откликнуться
export const apply = async (req: Request, res: Response) => {
  try {
    const { id: shiftId } = req.params;
    const { seekerId } = req.body;
    if (!seekerId) return res.status(400).json({ error: 'seekerId обязателен' });

    const application = await prisma.application.create({
      data: { shiftId, seekerId }
    });

    // Сценарий Б: Push работодателю
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

// GET /shifts/:id/applicants — список кандидатов
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

// POST /applications/:id/accept — принять кандидата
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

    // Закрыть смену
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

// POST /applications/:id/rate — оценить с комментарием через pg
export const rateApplication = async (req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    const { stars, comment } = req.body;
    const applicationId = req.params.id;

    if (!stars || stars < 1 || stars > 5) {
      return res.status(400).json({ error: 'stars от 1 до 5' });
    }

    // Получить application + данные соискателя
    const { rows: appRows } = await client.query(
      `SELECT a."seekerId", u."aiScore", u."ratingCount", u."name"
       FROM "Application" a
       JOIN "User" u ON u.id = a."seekerId"
       WHERE a.id = $1 LIMIT 1`,
      [applicationId]
    );

    if (appRows.length === 0) {
      return res.status(404).json({ error: 'Не найдено' });
    }

    const app = appRows[0];

    // Сохранить rating и comment в Application
    await client.query(
      `UPDATE "Application" SET "rating" = $1, "comment" = $2 WHERE id = $3`,
      [Number(stars), comment || null, applicationId]
    );

    // Пересчитать aiScore соискателя
    const currentScore = Number(app.aiScore) || 0;
    const currentCount = Number(app.ratingCount) || 0;
    const newCount = currentCount + 1;
    const newScore = Math.min(100, Math.max(0,
      Math.round(((currentScore * currentCount) + (Number(stars) * 20)) / newCount)
    ));

    // Обновить aiScore и ratingCount в User
    await client.query(
      `UPDATE "User" SET "aiScore" = $1, "ratingCount" = $2 WHERE id = $3`,
      [newScore, newCount, app.seekerId]
    );

    console.log(`[RATING] ${app.name}: ${currentScore}→${newScore} (${stars}⭐) "${comment || ''}"`);

    res.json({ success: true, newScore, ratingCount: newCount, comment });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  } finally {
    client.release();
  }
};