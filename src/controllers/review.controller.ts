import { Request, Response } from 'express';
import { Pool } from 'pg';
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

export const createReview = async (req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    const { fromUserId, toUserId, text, stars } = req.body;

    if (!fromUserId || !toUserId || !text || !stars) {
      return res.status(400).json({ error: 'Не все поля заполнены' });
    }

    // Получаем все завершённые смены между этими двумя пользователями
    const { rows: completedShifts } = await client.query(
      `SELECT a.id as "applicationId", s.id as "shiftId"
       FROM "Application" a
       JOIN "Shift" s ON s.id = a."shiftId"
       WHERE a.status = 'COMPLETED'
       AND (
         (a."seekerId" = $1 AND s."creatorId" = $2)
         OR
         (a."seekerId" = $2 AND s."creatorId" = $1)
       )`,
      [fromUserId, toUserId]
    );

    // Проверяем что вообще работали вместе
    if (!completedShifts.length) {
      return res.status(403).json({
        error: 'Отзыв можно оставить только после завершённой совместной смены'
      });
    }

    // Считаем сколько отзывов уже оставил этот пользователь
    const { rows: existingReviews } = await client.query(
      `SELECT id FROM "Review" WHERE "fromUserId" = $1 AND "toUserId" = $2`,
      [fromUserId, toUserId]
    );

    // Один отзыв на одну смену — не больше чем смен
    if (existingReviews.length >= completedShifts.length) {
      return res.status(409).json({
        error: `Вы уже оставили отзыв за все ${completedShifts.length} завершённых смен`
      });
    }

    // Сохранить отзыв
    const { rows } = await client.query(
      `INSERT INTO "Review" ("fromUserId", "toUserId", text, stars)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [fromUserId, toUserId, text, Number(stars)]
    );

    // Пересчитать рейтинг получателя
    await client.query(
      `UPDATE "User" SET
        "employerRating" = (SELECT AVG(stars) FROM "Review" WHERE "toUserId" = $1),
        "employerRatingCount" = (SELECT COUNT(*) FROM "Review" WHERE "toUserId" = $1),
        "aiScore" = LEAST(100, ROUND(
          (SELECT AVG(stars) FROM "Review" WHERE "toUserId" = $1) * 20
        ))
       WHERE id = $1`,
      [toUserId]
    );

    res.status(201).json(rows[0]);
  } catch (e: any) {
    console.error('[REVIEW ERROR]', e.message);
    res.status(500).json({ error: e.message });
  } finally { client.release(); }
};

export const getReviews = async (req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    const { rows } = await client.query(
      `SELECT r.*, u.name AS "fromName", u.role AS "fromRole",
        u."photoUrl" AS "fromPhoto"
       FROM "Review" r
       JOIN "User" u ON u.id = r."fromUserId"
       WHERE r."toUserId" = $1
       ORDER BY r."createdAt" DESC`,
      [req.params.userId]
    );
    res.json(rows);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  } finally { client.release(); }
};

export const deleteReview = async (req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { fromUserId } = req.body;

    const { rows: review } = await client.query(
      `SELECT * FROM "Review" WHERE id = $1`, [id]
    );
    if (!review.length) {
      return res.status(404).json({ error: 'Отзыв не найден' });
    }
    if (fromUserId && review[0].fromUserId !== fromUserId) {
      return res.status(403).json({ error: 'Нельзя удалить чужой отзыв' });
    }
    const toUserId = review[0].toUserId;
    await client.query(`DELETE FROM "Review" WHERE id = $1`, [id]);
    await client.query(
      `UPDATE "User" SET
        "employerRating" = (SELECT AVG(stars) FROM "Review" WHERE "toUserId" = $1),
        "employerRatingCount" = (SELECT COUNT(*) FROM "Review" WHERE "toUserId" = $1),
        "aiScore" = LEAST(100, ROUND(
          COALESCE((SELECT AVG(stars) FROM "Review" WHERE "toUserId" = $1), 0) * 20
        ))
       WHERE id = $1`,
      [toUserId]
    );
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  } finally { client.release(); }
};