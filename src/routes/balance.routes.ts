import { Router } from 'express';
import { getBalance, topUp, withdraw, getHistory } from '../controllers/balance.controller';

const router = Router();

router.get('/balance/:userId', getBalance);
router.post('/balance/:userId/topup', topUp);
router.post('/balance/:userId/withdraw', withdraw);
router.get('/balance/:userId/history', getHistory);

export default router;