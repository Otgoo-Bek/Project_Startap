import { Router } from 'express';
import { Pool } from 'pg';

const router = Router();
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

router.get('/admin/stats', async (req, res) => {
  const client = await pool.connect();
  try {
    const [usersRes, shiftsRes, paymentsRes, activeUsersRes, recentUsersRes, recentShiftsRes] =
      await Promise.all([
        client.query(`SELECT role, COUNT(*) as count FROM "User" GROUP BY role`),
        client.query(`SELECT status, COUNT(*) as count FROM "Shift" GROUP BY status`),
        client.query(`SELECT COALESCE(SUM(amount), 0) as total FROM "Transaction" WHERE type = 'PAYMENT'`),
        client.query(`SELECT COUNT(*) as count FROM "User" WHERE "updatedAt" > NOW() - INTERVAL '30 days'`),
        client.query(`SELECT id, name, role, "createdAt", phone FROM "User" ORDER BY "createdAt" DESC LIMIT 5`),
        client.query(`SELECT s.id, s.role, s.establishment, s.pay, s.status, s."createdAt", u.name as "creatorName" FROM "Shift" s JOIN "User" u ON u.id = s."creatorId" ORDER BY s."createdAt" DESC LIMIT 5`),
      ]);

    const usersByRole = { B2C: 0, B2B: 0 };
    usersRes.rows.forEach(r => { usersByRole[r.role as 'B2C'|'B2B'] = parseInt(r.count); });

    const shiftsByStatus: Record<string,number> = { OPEN: 0, COMPLETED: 0, CANCELLED: 0 };
    shiftsRes.rows.forEach(r => { shiftsByStatus[r.status] = parseInt(r.count); });

    res.json({
      users: { total: usersByRole.B2C + usersByRole.B2B, seekers: usersByRole.B2C, employers: usersByRole.B2B, active: parseInt(activeUsersRes.rows[0].count) },
      shifts: { total: Object.values(shiftsByStatus).reduce((a,b)=>a+b,0), open: shiftsByStatus.OPEN, completed: shiftsByStatus.COMPLETED, cancelled: shiftsByStatus.CANCELLED },
      payments: { total: parseInt(paymentsRes.rows[0].total) },
      recentUsers: recentUsersRes.rows,
      recentShifts: recentShiftsRes.rows,
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  } finally { client.release(); }
});

router.get('/admin', (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>МигРабота — Админ панель</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0D1B2A; color: #E0E1DD; min-height: 100vh; }
  .header { background: #1B263B; border-bottom: 1px solid #263550; padding: 20px 32px; display: flex; align-items: center; justify-content: space-between; }
  .logo { font-size: 22px; font-weight: 800; color: #E0E1DD; }
  .logo span { color: #C9B47F; }
  .badge { background: #C9B47F22; color: #C9B47F; border: 1px solid #C9B47F44; border-radius: 20px; padding: 4px 14px; font-size: 12px; font-weight: 700; letter-spacing: 1px; }
  .updated { color: #778DA9; font-size: 12px; }
  .container { padding: 32px; max-width: 1200px; margin: 0 auto; }
  .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; margin-bottom: 32px; }
  .card { background: #1B263B; border-radius: 16px; padding: 24px; border: 1px solid #263550; position: relative; overflow: hidden; }
  .card::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px; background: var(--accent, #C9B47F); }
  .card.blue { --accent: #378ADD; }
  .card.green { --accent: #1D9E75; }
  .card.red { --accent: #E24444; }
  .card.gold { --accent: #C9B47F; }
  .card-icon { font-size: 28px; margin-bottom: 12px; }
  .card-label { color: #778DA9; font-size: 12px; font-weight: 600; letter-spacing: 1px; margin-bottom: 8px; text-transform: uppercase; }
  .card-value { font-size: 42px; font-weight: 900; color: #E0E1DD; line-height: 1; margin-bottom: 8px; }
  .card-sub { color: #778DA9; font-size: 12px; }
  .card-sub span { color: #C9B47F; font-weight: 600; }
  .section { margin-bottom: 32px; }
  .section-title { font-size: 11px; color: #778DA9; letter-spacing: 1.5px; font-weight: 600; margin-bottom: 16px; text-transform: uppercase; }
  .shifts-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 32px; }
  .shift-card { background: #1B263B; border-radius: 12px; padding: 20px; border: 1px solid #263550; text-align: center; }
  .shift-num { font-size: 36px; font-weight: 900; margin-bottom: 4px; }
  .shift-lbl { color: #778DA9; font-size: 12px; font-weight: 600; }
  .open { color: #C9B47F; }
  .completed { color: #1D9E75; }
  .cancelled { color: #E24444; }
  .table { background: #1B263B; border-radius: 16px; border: 1px solid #263550; overflow: hidden; }
  .table-header { display: grid; padding: 14px 20px; border-bottom: 1px solid #263550; font-size: 11px; color: #778DA9; font-weight: 600; letter-spacing: 1px; text-transform: uppercase; }
  .users-header { grid-template-columns: 2fr 1fr 1fr 1fr; }
  .shifts-header { grid-template-columns: 2fr 1fr 1fr 1fr; }
  .table-row { display: grid; padding: 14px 20px; border-bottom: 1px solid #1a2535; align-items: center; transition: background 0.15s; }
  .table-row:last-child { border-bottom: none; }
  .table-row:hover { background: #1a2535; }
  .table-row.users-row { grid-template-columns: 2fr 1fr 1fr 1fr; }
  .table-row.shifts-row { grid-template-columns: 2fr 1fr 1fr 1fr; }
  .name { font-weight: 600; color: #E0E1DD; font-size: 14px; }
  .sub { color: #778DA9; font-size: 12px; margin-top: 2px; }
  .role-badge { display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 700; }
  .role-b2c { background: #C9B47F22; color: #C9B47F; border: 1px solid #C9B47F44; }
  .role-b2b { background: #378ADD22; color: #378ADD; border: 1px solid #378ADD44; }
  .status-badge { display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 700; }
  .status-open { background: #C9B47F22; color: #C9B47F; border: 1px solid #C9B47F44; }
  .status-completed { background: #1D9E7522; color: #1D9E75; border: 1px solid #1D9E7544; }
  .status-cancelled { background: #E2444422; color: #E24444; border: 1px solid #E2444444; }
  .pay { color: #C9B47F; font-weight: 700; }
  .date { color: #778DA9; font-size: 12px; }
  .refresh-btn { background: #C9B47F; color: #0D1B2A; border: none; border-radius: 10px; padding: 10px 20px; font-weight: 700; font-size: 13px; cursor: pointer; transition: opacity 0.2s; }
  .refresh-btn:hover { opacity: 0.85; }
  .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
  @media (max-width: 768px) { .two-col { grid-template-columns: 1fr; } .shifts-grid { grid-template-columns: 1fr; } .container { padding: 16px; } }
  .loading { text-align: center; padding: 40px; color: #778DA9; }
  .error { background: #E2444422; border: 1px solid #E2444444; border-radius: 12px; padding: 16px; color: #E24444; margin-bottom: 16px; }
</style>
</head>
<body>
<div class="header">
  <div class="logo"><span>Миг</span>Работа</div>
  <div style="display:flex;align-items:center;gap:16px">
    <span class="badge">АДМИН ПАНЕЛЬ</span>
    <span class="updated" id="updated">Загрузка...</span>
    <button class="refresh-btn" onclick="loadStats()">🔄 Обновить</button>
  </div>
</div>

<div class="container">
  <div id="error" style="display:none" class="error"></div>

  <div class="grid">
    <div class="card gold">
      <div class="card-icon">👥</div>
      <div class="card-label">Всего пользователей</div>
      <div class="card-value" id="total-users">—</div>
      <div class="card-sub">Активных за 30 дней: <span id="active-users">—</span></div>
    </div>
    <div class="card blue">
      <div class="card-icon">👤</div>
      <div class="card-label">Соискателей</div>
      <div class="card-value" id="seekers">—</div>
      <div class="card-sub">Роль: <span>B2C</span></div>
    </div>
    <div class="card">
      <div class="card-icon">🏢</div>
      <div class="card-label">Работодателей</div>
      <div class="card-value" id="employers">—</div>
      <div class="card-sub">Роль: <span>B2B</span></div>
    </div>
    <div class="card green">
      <div class="card-icon">💰</div>
      <div class="card-label">Выплачено</div>
      <div class="card-value" id="payments">—</div>
      <div class="card-sub">Всего транзакций</div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Смены по статусам</div>
    <div class="shifts-grid">
      <div class="shift-card">
        <div class="shift-num open" id="shifts-open">—</div>
        <div class="shift-lbl">🟡 Открытые</div>
      </div>
      <div class="shift-card">
        <div class="shift-num completed" id="shifts-completed">—</div>
        <div class="shift-lbl">✅ Завершённые</div>
      </div>
      <div class="shift-card">
        <div class="shift-num cancelled" id="shifts-cancelled">—</div>
        <div class="shift-lbl">❌ Отменённые</div>
      </div>
    </div>
  </div>

  <div class="two-col">
    <div class="section">
      <div class="section-title">Последние пользователи</div>
      <div class="table">
        <div class="table-header users-header">
          <div>Пользователь</div>
          <div>Роль</div>
          <div>Телефон</div>
          <div>Дата</div>
        </div>
        <div id="users-table"><div class="loading">Загрузка...</div></div>
      </div>
    </div>

    <div class="section">
      <div class="section-title">Последние смены</div>
      <div class="table">
        <div class="table-header shifts-header">
          <div>Смена</div>
          <div>Статус</div>
          <div>Оплата</div>
          <div>Дата</div>
        </div>
        <div id="shifts-table"><div class="loading">Загрузка...</div></div>
      </div>
    </div>
  </div>
</div>

<script>
async function loadStats() {
  try {
    const res = await fetch('/admin/stats');
    if (!res.ok) throw new Error('Ошибка сервера');
    const data = await res.json();

    document.getElementById('total-users').textContent = data.users.total;
    document.getElementById('active-users').textContent = data.users.active;
    document.getElementById('seekers').textContent = data.users.seekers;
    document.getElementById('employers').textContent = data.users.employers;
    document.getElementById('payments').textContent = data.payments.total.toLocaleString('ru-RU') + ' ₽';
    document.getElementById('shifts-open').textContent = data.shifts.open;
    document.getElementById('shifts-completed').textContent = data.shifts.completed;
    document.getElementById('shifts-cancelled').textContent = data.shifts.cancelled;

    document.getElementById('users-table').innerHTML = data.recentUsers.map(u => \`
      <div class="table-row users-row">
        <div>
          <div class="name">\${u.name || 'Без имени'}</div>
          <div class="sub">\${u.id.slice(0, 16)}...</div>
        </div>
        <div><span class="role-badge \${u.role === 'B2C' ? 'role-b2c' : 'role-b2b'}">\${u.role === 'B2C' ? '👤 Соискатель' : '🏢 Работодатель'}</span></div>
        <div class="sub">\${u.phone || 'Не указан'}</div>
        <div class="date">\${new Date(u.createdAt).toLocaleDateString('ru-RU')}</div>
      </div>
    \`).join('');

    document.getElementById('shifts-table').innerHTML = data.recentShifts.map(s => \`
      <div class="table-row shifts-row">
        <div>
          <div class="name">\${s.role}</div>
          <div class="sub">\${s.establishment}</div>
        </div>
        <div><span class="status-badge status-\${s.status.toLowerCase()}">\${s.status === 'OPEN' ? '🟡 Открыта' : s.status === 'COMPLETED' ? '✅ Завершена' : '❌ Отменена'}</span></div>
        <div class="pay">\${Number(s.pay).toLocaleString('ru-RU')} ₽</div>
        <div class="date">\${new Date(s.createdAt).toLocaleDateString('ru-RU')}</div>
      </div>
    \`).join('');

    document.getElementById('updated').textContent = 'Обновлено: ' + new Date().toLocaleTimeString('ru-RU');
    document.getElementById('error').style.display = 'none';
  } catch(e) {
    document.getElementById('error').style.display = 'block';
    document.getElementById('error').textContent = 'Ошибка загрузки данных: ' + e.message;
  }
}

loadStats();
setInterval(loadStats, 30000);
</script>
</body>
</html>`);
});

export default router;
