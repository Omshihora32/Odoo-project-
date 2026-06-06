import { Router } from 'express';
import {
  getQuotations,
  getQuotationById,
  createQuotation,
  updateQuotation,
  submitQuotation,
  compareQuotations,
  deleteQuotation,
} from '../controllers/quotations.controller';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/rbac';
import { validate } from '../middleware/validate';
import { createQuotationSchema, updateQuotationSchema } from '../validators/quotation.validator';

const router = Router();

router.use(authenticate);

router.get('/', authorize('ADMIN', 'PROCUREMENT_OFFICER', 'MANAGER', 'VENDOR'), getQuotations);
router.get('/rfq/:rfqId/compare', authorize('ADMIN', 'PROCUREMENT_OFFICER', 'MANAGER'), compareQuotations);
router.get('/:id', authorize('ADMIN', 'PROCUREMENT_OFFICER', 'MANAGER', 'VENDOR'), getQuotationById);
router.post('/', authorize('VENDOR'), validate(createQuotationSchema), createQuotation);
router.put('/:id', authorize('VENDOR'), validate(updateQuotationSchema), updateQuotation);
router.post('/:id/submit', authorize('VENDOR'), submitQuotation);
router.delete('/:id', authorize('VENDOR'), deleteQuotation);

export default router;
