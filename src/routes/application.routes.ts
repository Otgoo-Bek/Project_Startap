import { Router } from 'express';
import {
  apply,
  getApplicants,
  accept,
  complete,
  rateApplication,
} from '../controllers/application.controller';

const router = Router();

router.post('/shifts/:id/apply', apply);
router.get('/shifts/:id/applicants', getApplicants);
router.post('/applications/:id/accept', accept);
router.post('/applications/:id/complete', complete);   // Завершить смену
router.post('/applications/:id/rate', rateApplication); // Оценить с комментарием

export default router;