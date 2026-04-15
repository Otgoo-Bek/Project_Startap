import { Router } from 'express';
import { getShifts, createShift, cancelShift } from '../controllers/shift.controller';

const router = Router();

router.get('/shifts', getShifts);
router.post('/shifts', createShift);
router.post('/shifts/:id/cancel', cancelShift);
export default router;