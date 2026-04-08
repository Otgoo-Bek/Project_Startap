import { Request, Response } from 'express';
import * as ShiftService from '../services/shift.service';
import { sendPushToHotUsers } from '../services/notification.service';

// GET /shifts
export const getShifts = async (req: Request, res: Response) => {
  try {
    const shifts = await ShiftService.getAllShifts();
    res.json(shifts);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
};

// POST /shifts
export const createShift = async (req: Request, res: Response) => {
  try {
    const shift = await ShiftService.createShift(req.body);
    await sendPushToHotUsers(shift);
    res.status(201).json(shift);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
};