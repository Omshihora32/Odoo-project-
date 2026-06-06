import { Router } from 'express';
import { getDashboardStats, getAnalytics, exportReports } from '../controllers/reports.controller';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/rbac';

const router = Router();

router.use(authenticate);

router.get('/dashboard', getDashboardStats);
router.get('/analytics', authorize('ADMIN', 'PROCUREMENT_OFFICER', 'MANAGER'), getAnalytics);
router.get('/export/:format', authorize('ADMIN', 'PROCUREMENT_OFFICER', 'MANAGER'), exportReports);

export default router;
