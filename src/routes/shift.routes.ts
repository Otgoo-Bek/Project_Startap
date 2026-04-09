import { Router } from 'express';
import { getShifts, createShift } from '../controllers/shift.controller';

const router = Router();

router.get('/shifts', getShifts);
router.post('/shifts', createShift);

export default router;