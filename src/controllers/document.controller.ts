import { Request, Response } from 'express';
import { Pool } from 'pg';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  }
});

export const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

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
    const { userId, name, type } = req.body;
    const file = req.file;
    
    if (!file) return res.status(400).json({ error: 'Файл не загружен' });
    
    const baseUrl = process.env.BASE_URL || 'https://asap-horeca-backend-k6q2.onrender.com';
    const url = `${baseUrl}/uploads/${file.filename}`;
    
    const { rows } = await client.query(
      `INSERT INTO "Document" ("userId", name, url, type)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [userId, name || file.originalname, url, type || file.mimetype || 'document']
    );
    res.status(201).json(rows[0]);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  } finally { client.release(); }
};

export const deleteDoc = async (req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    await client.query(`DELETE FROM "Document" WHERE id = $1`, [req.params.id]);
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  } finally { client.release(); }
};