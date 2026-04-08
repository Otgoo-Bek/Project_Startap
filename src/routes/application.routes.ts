import { Router } from 'express';
import { apply, getApplicants, accept } from '../controllers/application.controller';

const router = Router();

router.post('/shifts/:id/apply', apply);
router.get('/shifts/:id/applicants', getApplicants);
router.post('/applications/:id/accept', accept);

export default router;