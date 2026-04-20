import { Router } from 'express';
import { createReview, getReviews } from '../controllers/review.controller';

const router = Router();

router.post('/reviews', createReview);
router.get('/reviews/:userId', getReviews);

export default router;