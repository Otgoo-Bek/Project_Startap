import { sendPushToEmployer, sendPushToSeeker } from '../services/notification.service';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// POST /shifts/:id/apply — откликнуться на смену
export const apply = async (req, res) => {
  try {
    const { id: shiftId } = req.params;
    const { seekerId } = req.body;
    if (!seekerId) return res.status(400).json({ error: 'seekerId обязателен' });

    const application = await prisma.application.create({
      data: { shiftId, seekerId }
    });

    // Найти смену и уведомить работодателя
    const shift = await prisma.shift.findUnique({ where: { id: shiftId } });
    const seeker = await prisma.user.findUnique({ where: { id: seekerId } });
    if (shift && seeker) {
      await sendPushToEmployer(shift.creatorId, seeker.name || 'Соискатель');
    }

    res.status(201).json(application);
  } catch (e: any) {
    if (e.code === 'P2002') return res.status(409).json({ error: 'Уже откликался' });
    res.status(500).json({ error: e.message });
  }
};

// GET /shifts/:id/applicants — список кандидатов
export const getApplicants = async (req, res) => {
  try {
    const applicants = await prisma.application.findMany({
      where: { shiftId: req.params.id },
      include: { seeker: true },
      orderBy: { seeker: { aiScore: 'desc' } }
    });
    res.json(applicants);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
};

// POST /applications/:id/accept — принять кандидата
export const accept = async (req, res) => {
  try {
    const application = await prisma.application.update({
      where: { id: req.params.id },
      data: { status: 'APPROVED' },
      include: { shift: true, seeker: true }
    });

    // Уведомить соискателя что его приняли
    await sendPushToSeeker(
      application.seekerId,
      application.shift.role
    );

    res.json(application);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
};