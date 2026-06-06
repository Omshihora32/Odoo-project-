import { Router } from 'express';
import {
  getActivityLogs,
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from '../controllers/activities.controller';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/rbac';

const router = Router();

router.use(authenticate);

// Activity logs route
router.get('/activity-logs', authorize('ADMIN'), getActivityLogs);

// Notification routes
router.get('/notifications', getNotifications);
router.put('/notifications/read-all', markAllNotificationsRead);
router.put('/notifications/:id/read', markNotificationRead);

export default router;
