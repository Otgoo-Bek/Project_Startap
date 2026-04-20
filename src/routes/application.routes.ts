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

export default router;