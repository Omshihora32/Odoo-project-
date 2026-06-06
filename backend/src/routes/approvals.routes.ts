import { Router, Response, NextFunction } from 'express';
import {
  getApprovals,
  getApprovalById,
  createApproval,
  updateApproval,
  deleteApproval,
} from '../controllers/approvals.controller';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/rbac';
import { validate } from '../middleware/validate';
import { createApprovalSchema, updateApprovalSchema } from '../validators/approval.validator';
import { AuthRequest } from '../types';

const router = Router();

router.use(authenticate);

router.get('/', authorize('ADMIN', 'PROCUREMENT_OFFICER', 'MANAGER'), getApprovals);
router.get('/:id', authorize('ADMIN', 'PROCUREMENT_OFFICER', 'MANAGER'), getApprovalById);
router.post('/', authorize('ADMIN', 'PROCUREMENT_OFFICER'), validate(createApprovalSchema), createApproval);
router.put('/:id', authorize('ADMIN', 'MANAGER'), validate(updateApprovalSchema), updateApproval);

// Helper routes for direct approval/rejection as listed in README.md
router.post('/:id/approve', authorize('ADMIN', 'MANAGER'), (req: AuthRequest, res: Response, next: NextFunction) => {
  req.body.status = 'APPROVED';
  updateApproval(req, res, next);
});
router.post('/:id/approved', authorize('ADMIN', 'MANAGER'), (req: AuthRequest, res: Response, next: NextFunction) => {
  req.body.status = 'APPROVED';
  updateApproval(req, res, next);
});

router.post('/:id/reject', authorize('ADMIN', 'MANAGER'), (req: AuthRequest, res: Response, next: NextFunction) => {
  req.body.status = 'REJECTED';
  updateApproval(req, res, next);
});
router.post('/:id/rejected', authorize('ADMIN', 'MANAGER'), (req: AuthRequest, res: Response, next: NextFunction) => {
  req.body.status = 'REJECTED';
  updateApproval(req, res, next);
});

router.delete('/:id', authorize('ADMIN', 'PROCUREMENT_OFFICER'), deleteApproval);

export default router;
