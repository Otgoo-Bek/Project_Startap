import { Router } from 'express';
import { syncUser, toggleHot, getMe, patchMe } from '../controllers/user.controller';

const router = Router();

router.post('/users/sync', syncUser);
router.patch('/seeker/status', toggleHot);
router.get('/users/me', getMe);
router.patch('/users/me', patchMe);

export default router;