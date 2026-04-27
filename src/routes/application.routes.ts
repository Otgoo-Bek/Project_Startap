import { Router } from 'express';
import { apply, getApplicants, accept, complete, 
  rateApplication, confirmByEmployer, confirmBySeeker } 
  from '../controllers/application.controller';
const router = Router();
import { Pool } from 'pg';
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

router.post('/shifts/:id/apply', apply);
router.get('/shifts/:id/applicants', getApplicants);
router.post('/applications/:id/accept', accept);
router.post('/applications/:id/complete', complete);   // Завершить смену
router.post('/applications/:id/rate', rateApplication); // Оценить с комментарием
router.post('/applications/:id/confirm-employer', confirmByEmployer);
router.post('/applications/:id/confirm-seeker', confirmBySeeker);
router.post('/applications/:id/cancel-seeker', async (req, res) => {
  const client = await pool.connect();
  try {
    const { rows } = await client.query(
      `SELECT a.*, s.pay, s."creatorId" FROM "Application" a
       JOIN "Shift" s ON s.id = a."shiftId"
       WHERE a.id = $1`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Не найдено' });
    
    const app = rows[0];
    
    // Вернуть деньги работодателю
    await client.query(
      `UPDATE "User" SET balance = balance + $1 WHERE id = $2`,
      [app.pay, app.creatorId]
    );
    
    // Отменить отклик
    await client.query(
      `UPDATE "Application" SET status = 'CANCELLED' WHERE id = $1`,
      [req.params.id]
    );
    
    // Открыть смену снова
    await client.query(
      `UPDATE "Shift" SET status = 'OPEN' WHERE id = $1`,
      [app.shiftId]
    );
    
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  } finally { client.release(); }
});

router.get('/applications/active/:seekerId', async (req, res) => {
  const client = await pool.connect();
  try {
    const { rows } = await client.query(
      `SELECT a.*, 
        json_build_object(
          'id', s.id, 'role', s.role, 'address', s.address,
          'pay', s.pay, 'establishment', s.establishment,
          'creatorId', s."creatorId", 'status', s.status
        ) as shift
       FROM "Application" a
       JOIN "Shift" s ON s.id = a."shiftId"
       WHERE a."seekerId" = $1
       AND a.status IN ('APPROVED', 'COMPLETED')
       ORDER BY a."createdAt" DESC`,
      [req.params.seekerId]
    );
    res.json(rows);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  } finally { client.release(); }
});
router.get('/applications/completed', async (req, res) => {
  const { seekerId, employerId } = req.query;
  try {
    const { rows } = await pool.query(`
      SELECT COUNT(*) as count 
      FROM "Application" a
      JOIN "Shift" s ON a."shiftId" = s.id
      WHERE a."seekerId" = $1 
      AND s."creatorId" = $2 
      AND a.status = 'COMPLETED'
    `, [seekerId, employerId]);
    res.json({ hasCompleted: Number(rows[0].count) > 0 });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});
export default router;