import { Request, Response } from 'express';
import * as AppService from '../services/application.service';

// POST /shifts/:id/apply
export const apply = async (req: Request, res: Response) => {
  try {
    const { id: shiftId } = req.params;
    const { seekerId } = req.body;
    if (!seekerId) return res.status(400).json({ error: 'seekerId обязателен' });
    const application = await AppService.applyToShift(shiftId, seekerId);
    res.status(201).json(application);
  } catch (e: any) {
    // Если уже откликался — вернуть понятную ошибку
    if (e.code === 'P2002') return res.status(409).json({ error: 'Уже откликался' });
    res.status(500).json({ error: e.message });
  }
};

// GET /shifts/:id/applicants
export const getApplicants = async (req: Request, res: Response) => {
  try {
    const { id: shiftId } = req.params;
    const applicants = await AppService.getApplicants(shiftId);
    res.json(applicants);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
};

// POST /applications/:id/accept
export const accept = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updated = await AppService.acceptApplication(id);
    res.json(updated);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
};