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

    // Проверить что уже не оставлял отзыв
    const { rows: existing } = await client.query(
      `SELECT id FROM "Review" WHERE "fromUserId" = $1 AND "toUserId" = $2 LIMIT 1`,
      [fromUserId, toUserId]
    );
    if (existing.length) {
      return res.status(409).json({ error: 'Вы уже оставляли отзыв этому пользователю' });
    }

    // Проверить что работали вместе
    const { rows: check } = await client.query(
      `SELECT a.id FROM "Application" a
       JOIN "Shift" s ON s.id = a."shiftId"
       WHERE a.status = 'COMPLETED'
       AND (
         (a."seekerId" = $1 AND s."creatorId" = $2)
         OR
         (a."seekerId" = $2 AND s."creatorId" = $1)
       ) LIMIT 1`,
      [fromUserId, toUserId]
    );
    if (!check.length) {
      return res.status(403).json({ error: 'Можно оставить отзыв только после совместной работы' });
    }

    // Сохранить отзыв
    const { rows } = await client.query(
      `INSERT INTO "Review" ("fromUserId", "toUserId", text, stars)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [fromUserId, toUserId, text, Number(stars)]
    );

    // Пересчитать рейтинг пользователя
    await client.query(
      `UPDATE "User" SET
        "employerRating" = (
          SELECT AVG(stars) FROM "Review" WHERE "toUserId" = $1
        ),
        "employerRatingCount" = (
          SELECT COUNT(*) FROM "Review" WHERE "toUserId" = $1
        ),
        "aiScore" = LEAST(100, ROUND(
          (SELECT AVG(stars) FROM "Review" WHERE "toUserId" = $1) * 20
        ))
       WHERE id = $1`,
      [toUserId]
    );

    res.status(201).json(rows[0]);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  } finally { client.release(); }
};

export const getReviews = async (req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    const { rows } = await client.query(
      `SELECT r.*, u.name AS "fromName", u.role AS "fromRole"
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