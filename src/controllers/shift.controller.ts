import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { sendPushToHotUsers } from '../services/notification.service';

const prisma = new PrismaClient();
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// GET /shifts — список открытых смен
export const getShifts = async (req: Request, res: Response) => {
  try {
    const shifts = await prisma.shift.findMany({
      where: { status: 'OPEN' },
      include: { creator: { select: { name: true, address: true } } },
      orderBy: { createdAt: 'desc' }
    });
    res.json(shifts);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
};

// POST /shifts — создать смену + проверить баланс
export const createShift = async (req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    const { role, establishment, address, startTime,
      pay, description, creatorId } = req.body;

    if (!creatorId) return res.status(400).json({ error: 'creatorId обязателен' });

    // Проверить баланс работодателя
    const { rows: balRows } = await client.query(
      `SELECT balance FROM "User" WHERE id = $1 AND role = 'B2B'`,
      [creatorId]
    );

    if (!balRows.length) {
      return res.status(404).json({ error: 'Работодатель не найден' });
    }

    const balance = Number(balRows[0].balance);
    const shiftPay = Number(pay);

    if (balance < shiftPay) {
      return res.status(400).json({
        error: `Недостаточно средств. Баланс: ${balance}₽, нужно: ${shiftPay}₽`,
        balance,
        required: shiftPay
      });
    }

    // Зарезервировать деньги (списать с баланса)
    await client.query(
      `UPDATE "User" SET balance = balance - $1 WHERE id = $2`,
      [shiftPay, creatorId]
    );

    // Создать смену
    const shift = await prisma.shift.create({
      data: { role, establishment, address,
        startTime: new Date(startTime),
        pay: shiftPay, description, creatorId }
    });

    // Записать транзакцию резервирования
    await client.query(
      `INSERT INTO "Transaction"
       (type, amount, "fromUserId", "shiftId", description, status)
       VALUES ('RESERVE', $1, $2, $3, $4, 'RESERVED')`,
      [shiftPay, creatorId, shift.id, `Резерв для смены: ${role}`]
    );

    // Сценарий А: Push всем горячим соискателям
    await sendPushToHotUsers(shift);

    res.status(201).json({ ...shift, balance: balance - shiftPay });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  } finally { client.release(); }
};

// POST /shifts/:id/cancel — отменить смену (вернуть деньги)
export const cancelShift = async (req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    const shift = await prisma.shift.findUnique({
      where: { id: req.params.id }
    });
    if (!shift) return res.status(404).json({ error: 'Смена не найдена' });
    if (shift.status !== 'OPEN') {
      return res.status(400).json({ error: 'Можно отменить только открытую смену' });
    }

    // Вернуть деньги работодателю
    await client.query(
      `UPDATE "User" SET balance = balance + $1 WHERE id = $2`,
      [shift.pay, shift.creatorId]
    );

    // Обновить статус смены
    await prisma.shift.update({
      where: { id: req.params.id },
      data: { status: 'CANCELLED' }
    });

    // Записать возврат
    await client.query(
      `INSERT INTO "Transaction"
       (type, amount, "toUserId", "shiftId", description)
       VALUES ('REFUND', $1, $2, $3, 'Отмена смены — возврат средств')`,
      [shift.pay, shift.creatorId, shift.id]
    );

    res.json({ success: true, refunded: shift.pay });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  } finally { client.release(); }
};