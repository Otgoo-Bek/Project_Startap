import { Router } from 'express';
import { getDocs, createDoc, deleteDoc } from '../controllers/document.controller';

const router = Router();

router.get('/documents/:userId', getDocs);
router.post('/documents', createDoc);
router.delete('/documents/:id', deleteDoc);

export default router;