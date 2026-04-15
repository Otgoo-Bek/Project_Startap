import { Request, Response } from 'express';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// GET /balance/:userId — получить баланс
export const getBalance = async (req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    const { rows } = await client.query(
      `SELECT id, name, role, balance, earnings FROM "User" WHERE id = $1`,
      [req.params.userId]
    );
    if (!rows.length) return res.status(404).json({ error: 'Не найден' });
    const u = rows[0];
    res.json({
      balance: Number(u.balance) || 0,
      earnings: Number(u.earnings) || 0,
      role: u.role,
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  } finally { client.release(); }
};

// POST /balance/:userId/topup — пополнить баланс (виртуально)
// В реальности здесь будет интеграция с ЮKassa
export const topUp = async (req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    const amount = Number(req.body.amount);
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Укажи сумму пополнения' });
    }

    // Пополнить баланс
    const { rows } = await client.query(
      `UPDATE "User" SET balance = balance + $1
       WHERE id = $2 AND role = 'B2B'
       RETURNING balance`,
      [amount, req.params.userId]
    );
    if (!rows.length) return res.status(404).json({ error: 'Работодатель не найден' });

    // Записать транзакцию
    await client.query(
      `INSERT INTO "Transaction"
       (type, amount, "toUserId", description)
       VALUES ('TOPUP', $1, $2, 'Пополнение баланса')`,
      [amount, req.params.userId]
    );

    res.json({
      success: true,
      newBalance: Number(rows[0].balance),
      message: `Баланс пополнен на ${amount}₽`
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  } finally { client.release(); }
};

// POST /balance/:userId/withdraw — запрос на вывод (виртуально)
export const withdraw = async (req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    const amount = Number(req.body.amount);
    const cardNumber = req.body.cardNumber;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Укажи сумму вывода' });
    }

    // Проверить баланс соискателя
    const { rows: userRows } = await client.query(
      `SELECT earnings FROM "User" WHERE id = $1 AND role = 'B2C'`,
      [req.params.userId]
    );
    if (!userRows.length) return res.status(404).json({ error: 'Соискатель не найден' });

    const earnings = Number(userRows[0].earnings);
    if (earnings < amount) {
      return res.status(400).json({
        error: `Недостаточно средств. Доступно: ${earnings}₽`
      });
    }

    // Списать с earnings
    await client.query(
      `UPDATE "User" SET earnings = earnings - $1 WHERE id = $2`,
      [amount, req.params.userId]
    );

    // Записать транзакцию (статус PENDING — ждёт ручной обработки)
    await client.query(
      `INSERT INTO "Transaction"
       (type, amount, "fromUserId", description, status)
       VALUES ('WITHDRAW', $1, $2, $3, 'PENDING')`,
      [amount, req.params.userId, `Вывод на карту ${cardNumber || 'не указана'}`]
    );

    res.json({
      success: true,
      message: `Заявка на вывод ${amount}₽ принята. Средства поступят в течение 1-3 дней.`
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  } finally { client.release(); }
};

// GET /balance/:userId/history — история транзакций
export const getHistory = async (req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    const { rows } = await client.query(
      `SELECT * FROM "Transaction"
       WHERE "fromUserId" = $1 OR "toUserId" = $1
       ORDER BY "createdAt" DESC LIMIT 50`,
      [req.params.userId]
    );
    res.json(rows);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  } finally { client.release(); }
};