import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { getShifts, createShift, cancelShift } from '../controllers/shift.controller';

const router = Router();
const prisma = new PrismaClient();

// GET /shifts — список открытых смен
router.get('/shifts', getShifts);

// POST /shifts — создать смену
router.post('/shifts', createShift);

// GET /shifts/completed/:userId — кол-во завершённых смен работодателя
// ВАЖНО: этот роут должен быть ВЫШЕ /shifts/:id !
router.get('/shifts/completed/:userId', async (req, res) => {
  try {
    const count = await prisma.shift.count({
      where: {
        creatorId: req.params.userId,
        status: 'COMPLETED'
      }
    });
    res.json({ count });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /shifts/:id/applicants — кандидаты смены
router.get('/shifts/:id/applicants', async (req, res) => {
  try {
    const applicants = await prisma.application.findMany({
      where: { shiftId: req.params.id },
      include: { seeker: true },
      orderBy: { seeker: { aiScore: 'desc' } }
    });
    res.json(applicants);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /shifts/:id/apply — откликнуться на смену
router.post('/shifts/:id/apply', async (req, res) => {
  try {
    const { seekerId } = req.body;
    if (!seekerId) return res.status(400).json({ error: 'seekerId обязателен' });
    const application = await prisma.application.create({
      data: { shiftId: req.params.id, seekerId }
    });
    res.status(201).json(application);
  } catch (e: any) {
    if (e.code === 'P2002') return res.status(409).json({ error: 'Уже откликался' });
    res.status(500).json({ error: e.message });
  }
});

// POST /shifts/:id/cancel — отменить смену (вернуть деньги)
router.post('/shifts/:id/cancel', cancelShift);

export default router;