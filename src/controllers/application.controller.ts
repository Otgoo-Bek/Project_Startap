import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});
import {
  sendPushToEmployer,
  sendPushToSeeker,
  sendPushToHotUsers,
} from '../services/notification.service';
import { Z_BLOCK } from 'node:zlib';

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
// POST /applications/:id/complete — завершить + перевести деньги
export const complete = async (req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    // Получить данные смены и соискателя
    const { rows } = await client.query(
      `SELECT a.*, s.pay, s.role AS "shiftRole", s.establishment
       FROM "Application" a
       JOIN "Shift" s ON s.id = a."shiftId"
       WHERE a.id = $1`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Не найдено' });

    const app = rows[0];
    const pay = Number(app.pay);

    // Перевести деньги соискателю
    await client.query(
      `UPDATE "User" SET earnings = earnings + $1 WHERE id = $2`,
      [pay, app.seekerId]
    );

    // Обновить статус смены и отклика
    await client.query(
      `UPDATE "Application" SET status = 'COMPLETED' WHERE id = $1`,
      [req.params.id]
    );
    await client.query(
      `UPDATE "Shift" SET status = 'COMPLETED' WHERE id = $1`,
      [app.shiftId]
    );

    // Записать транзакцию
    await client.query(
      `INSERT INTO "Transaction"
       (type, amount, "toUserId", "shiftId", description)
       VALUES ('PAYMENT', $1, $2, $3, $4)`,
      [pay, app.seekerId, app.shiftId,
       `Оплата смены: ${app.shiftRole} в ${app.establishment}`]
    );

    // Push соискателю
    await sendPushToSeeker(
      app.seekerId,
      `💰 Смена завершена! ${pay}₽ начислено на ваш счёт`
    );

    res.json({ success: true, earned: pay });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  } finally { client.release(); }
};
// POST /applications/:id/rate — дробный рейтинг + комментарий
export const rateApplication = async (req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    const { stars, comment } = req.body;
    const applicationId = req.params.id;

    if (!stars || stars < 1 || stars > 5) {
      return res.status(400).json({ error: 'stars от 1 до 5' });
    }

    const { rows: appRows } = await client.query(
      `SELECT a."seekerId", u."aiScore", u."ratingCount", u."name"
       FROM "Application" a
       JOIN "User" u ON u.id = a."seekerId"
       WHERE a.id = $1 LIMIT 1`,
      [applicationId]
    );
    if (appRows.length === 0) return res.status(404).json({ error: 'Не найдено' });

    const app = appRows[0];

    // Сохранить оценку в Application
    await client.query(
      `UPDATE "Application" SET "rating" = $1, "comment" = $2 WHERE id = $3`,
      [Number(stars), comment || null, applicationId]
    );

    // Дробная формула рейтинга
    const currentScore = Number(app.aiScore) || 0;
    const currentCount = Number(app.ratingCount) || 0;
    const newCount = currentCount + 1;
    const prevAvgStars = currentScore / 20;
    const newAvgStars = ((prevAvgStars * currentCount) + Number(stars)) / newCount;
    const newScore = Math.min(100, Math.max(0,
      Math.round(newAvgStars * 20 * 10) / 10
    ));

    await client.query(
      `UPDATE "User" SET "aiScore" = $1, "ratingCount" = $2 WHERE id = $3`,
      [newScore, newCount, app.seekerId]
    );

    console.log(`[RATING] ${app.name}: ${currentScore}→${newScore} (${stars}⭐) "${comment || ''}"`);
    res.json({ success: true, newScore, ratingCount: newCount, comment });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  } finally { client.release(); }
};
// POST /applications/:id/confirm-employer — работодатель подтверждает
export const confirmByEmployer = async (req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    const { rows } = await client.query(
      `UPDATE "Application" 
       SET "confirmedByEmployer" = true 
       WHERE id = $1 RETURNING *`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Не найдено' });
    
    // Если оба подтвердили — завершить смену автоматически
    const app = rows[0];
    if (app.confirmedByEmployer && app.confirmedBySeeker) {
      await client.query(
        `UPDATE "Application" SET status = 'COMPLETED' WHERE id = $1`,
        [req.params.id]
      );
      await client.query(
        `UPDATE "Shift" SET status = 'COMPLETED' WHERE id = $1`,
        [app.shiftId]
      );
    }
    res.json({ success: true, application: rows[0] });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  } finally { client.release(); }
};

// POST /applications/:id/confirm-seeker — соискатель подтверждает
export const confirmBySeeker = async (req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    const { rows } = await client.query(
      `UPDATE "Application"
       SET "confirmedBySeeker" = true
       WHERE id = $1 RETURNING *`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Не найдено' });

    const app = rows[0];
    if (app.confirmedByEmployer && app.confirmedBySeeker) {
      await client.query(
        `UPDATE "Application" SET status = 'COMPLETED' WHERE id = $1`,
        [req.params.id]
      );
      await client.query(
        `UPDATE "Shift" SET status = 'COMPLETED' WHERE id = $1`,
        [app.shiftId]
      );
    }
    res.json({ success: true, application: rows[0] });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  } finally { client.release(); }
};