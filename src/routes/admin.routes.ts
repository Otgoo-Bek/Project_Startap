import { Router } from 'express';
import { Pool } from 'pg';

const router = Router();
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// GET /admin/stats — все метрики
router.get('/admin/stats', async (req, res) => {
  const client = await pool.connect();
  try {
    const [
      usersRes,
      shiftsRes,
      paymentsRes,
      activeUsersRes,
      recentUsersRes,
      recentShiftsRes,
    ] = await Promise.all([
      // Пользователи по ролям
      client.query(`
        SELECT role, COUNT(*) as count
        FROM "User"
        GROUP BY role
      `),
      // Смены по статусам
      client.query(`
        SELECT status, COUNT(*) as count
        FROM "Shift"
        GROUP BY status
      `),
      // Общая сумма выплат
      client.query(`
        SELECT COALESCE(SUM(amount), 0) as total
        FROM "Transaction"
        WHERE type = 'PAYMENT'
      `),
      // Активные пользователи (заходили за последние 30 дней)
      client.query(`
        SELECT COUNT(*) as count
        FROM "User"
        WHERE "updatedAt" > NOW() - INTERVAL '30 days'
      `),
      // Последние 5 пользователей
      client.query(`
        SELECT id, name, role, "createdAt", phone
        FROM "User"
        ORDER BY "createdAt" DESC
        LIMIT 5
      `),
      // Последние 5 смен
      client.query(`
        SELECT s.id, s.role, s.establishment, s.pay, s.status, s."createdAt",
          u.name as "creatorName"
        FROM "Shift" s
        JOIN "User" u ON u.id = s."creatorId"
        ORDER BY s."createdAt" DESC
        LIMIT 5
      `),
    ]);

    const usersByRole = { B2C: 0, B2B: 0 };
    usersRes.rows.forEach(r => { usersByRole[r.role] = parseInt(r.count); });

    const shiftsByStatus = { OPEN: 0, COMPLETED: 0, CANCELLED: 0 };
    shiftsRes.rows.forEach(r => { shiftsByStatus[r.status] = parseInt(r.count); });

    res.json({
      users: {
        total: usersByRole.B2C + usersByRole.B2B,
        seekers: usersByRole.B2C,
        employers: usersByRole.B2B,
        active: parseInt(activeUsersRes.rows[0].count),
      },
      shifts: {
        total: Object.values(shiftsByStatus).reduce((a, b) => a + b, 0),
        open: shiftsByStatus.OPEN,
        completed: shiftsByStatus.COMPLETED,
        cancelled: shiftsByStatus.CANCELLED,
      },
      payments: {
        total: parseInt(paymentsRes.rows[0].total),
      },
      recentUsers: recentUsersRes.rows,
      recentShifts: recentShiftsRes.rows,
    });
  } catch (e: any) {
    console.error('[ADMIN STATS]', e.message);
    res.status(500).json({ error: e.message });
  } finally { client.release(); }
});

export default router;
