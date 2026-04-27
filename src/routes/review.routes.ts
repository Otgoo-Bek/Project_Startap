import { Router } from 'express';
import { createReview, getReviews, deleteReview } from '../controllers/review.controller';

const router = Router();

router.post('/reviews', createReview);
router.get('/reviews/:userId', getReviews);
router.delete('/reviews/:id', deleteReview);

export default router;