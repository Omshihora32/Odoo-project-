import { Router } from 'express';
import { getRFQs, getRFQById, createRFQ, updateRFQ, publishRFQ, deleteRFQ } from '../controllers/rfqs.controller';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/rbac';
import { validate } from '../middleware/validate';
import { createRFQSchema, updateRFQSchema, publishRFQSchema } from '../validators/rfq.validator';

const router = Router();

router.use(authenticate);

router.get('/', getRFQs);
router.get('/:id', getRFQById);
router.post('/', authorize('ADMIN', 'PROCUREMENT_OFFICER'), validate(createRFQSchema), createRFQ);
router.put('/:id', authorize('ADMIN', 'PROCUREMENT_OFFICER'), validate(updateRFQSchema), updateRFQ);
router.post('/:id/publish', authorize('ADMIN', 'PROCUREMENT_OFFICER'), validate(publishRFQSchema), publishRFQ);
router.delete('/:id', authorize('ADMIN', 'PROCUREMENT_OFFICER'), deleteRFQ);

export default router;
