import { Router, RequestHandler } from 'express';
import { getDocs, createDoc, deleteDoc, upload } from '../controllers/document.controller';

const router = Router();

router.get('/documents/:userId', getDocs);
router.delete('/documents/:id', deleteDoc);
router.post('/documents', upload.single('file') as RequestHandler, createDoc);

export default router;