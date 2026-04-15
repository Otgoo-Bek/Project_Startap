import { Router } from 'express';
import cors from 'cors';
import { getBalance, topUp, withdraw, getHistory } from '../controllers/balance.controller';

const router = Router();

// Явный CORS для всех balance роутов
const corsOptions = {
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
};

router.options('*', cors(corsOptions));
router.get('/balance/:userId', cors(corsOptions), getBalance);
router.post('/balance/:userId/topup', cors(corsOptions), topUp);
router.post('/balance/:userId/withdraw', cors(corsOptions), withdraw);
router.get('/balance/:userId/history', cors(corsOptions), getHistory);

export default router;