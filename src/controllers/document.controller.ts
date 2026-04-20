import { Request, Response } from 'express';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

export const getDocs = async (req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    const { rows } = await client.query(
      `SELECT * FROM "Document" WHERE "userId" = $1 ORDER BY "createdAt" DESC`,
      [req.params.userId]
    );
    res.json(rows);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  } finally { client.release(); }
};

export const createDoc = async (req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    const { userId, name, url, type } = req.body;
    const { rows } = await client.query(
      `INSERT INTO "Document" ("userId", name, url, type)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [userId, name, url, type || 'document']
    );
    res.status(201).json(rows[0]);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  } finally { client.release(); }
};

export const deleteDoc = async (req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    await client.query(
      `DELETE FROM "Document" WHERE id = $1`,
      [req.params.id]
    );
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  } finally { client.release(); }
};