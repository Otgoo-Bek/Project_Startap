import { Router } from 'express';
import { apply, getApplicants, accept, complete, 
  rateApplication, confirmByEmployer, confirmBySeeker } 
  from '../controllers/application.controller';
const router = Router();

router.post('/shifts/:id/apply', apply);
router.get('/shifts/:id/applicants', getApplicants);
router.post('/applications/:id/accept', accept);
router.post('/applications/:id/complete', complete);   // Завершить смену
router.post('/applications/:id/rate', rateApplication); // Оценить с комментарием
router.post('/applications/:id/confirm-employer', confirmByEmployer);
router.post('/applications/:id/confirm-seeker', confirmBySeeker);
export default router;