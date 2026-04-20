import { Request, Response } from 'express';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// POST /reviews — оставить отзыв
export const createReview = async (req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    const { fromUserId, toUserId, text, stars } = req.body;
    if (!fromUserId || !toUserId || !text || !stars) {
      return res.status(400).json({ error: 'Все поля обязательны' });
    }
    if (stars < 1 || stars > 5) {
      return res.status(400).json({ error: 'stars от 1 до 5' });
    }
    const { rows } = await client.query(
      `INSERT INTO "Review" ("fromUserId", "toUserId", text, stars)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [fromUserId, toUserId, text, Number(stars)]
    );
    res.status(201).json(rows[0]);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  } finally { client.release(); }
};

// GET /reviews/:userId — получить отзывы пользователя
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