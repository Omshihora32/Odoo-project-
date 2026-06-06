import { Router } from 'express';
import {
  getPurchaseOrders,
  getPurchaseOrderById,
  createPurchaseOrder,
  updatePurchaseOrder,
  generatePOPdf,
  sendPurchaseOrder,
  deletePurchaseOrder,
} from '../controllers/purchaseOrders.controller';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/rbac';
import { validate } from '../middleware/validate';
import { createPurchaseOrderSchema, updatePurchaseOrderSchema } from '../validators/purchaseOrder.validator';

const router = Router();

router.use(authenticate);

router.get('/', authorize('ADMIN', 'PROCUREMENT_OFFICER', 'MANAGER', 'VENDOR'), getPurchaseOrders);
router.get('/:id', authorize('ADMIN', 'PROCUREMENT_OFFICER', 'MANAGER', 'VENDOR'), getPurchaseOrderById);
router.get('/:id/pdf', authorize('ADMIN', 'PROCUREMENT_OFFICER', 'MANAGER', 'VENDOR'), generatePOPdf);
router.post('/', authorize('ADMIN', 'PROCUREMENT_OFFICER'), validate(createPurchaseOrderSchema), createPurchaseOrder);
router.put('/:id', authorize('ADMIN', 'PROCUREMENT_OFFICER'), validate(updatePurchaseOrderSchema), updatePurchaseOrder);
router.post('/:id/send', authorize('ADMIN', 'PROCUREMENT_OFFICER'), sendPurchaseOrder);
router.delete('/:id', authorize('ADMIN', 'PROCUREMENT_OFFICER'), deletePurchaseOrder);

export default router;
