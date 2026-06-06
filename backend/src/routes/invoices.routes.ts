import { Router } from 'express';
import {
  getInvoices,
  getInvoiceById,
  createInvoice,
  updateInvoice,
  generateInvoicePdf,
  sendInvoiceEmail,
  printInvoice,
  deleteInvoice,
} from '../controllers/invoices.controller';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/rbac';
import { validate } from '../middleware/validate';
import { createInvoiceSchema, updateInvoiceSchema } from '../validators/invoice.validator';

const router = Router();

router.use(authenticate);

router.get('/', authorize('ADMIN', 'PROCUREMENT_OFFICER', 'VENDOR'), getInvoices);
router.get('/:id', authorize('ADMIN', 'PROCUREMENT_OFFICER', 'VENDOR'), getInvoiceById);
router.get('/:id/pdf', authorize('ADMIN', 'PROCUREMENT_OFFICER', 'VENDOR'), generateInvoicePdf);
router.get('/:id/print', authorize('ADMIN', 'PROCUREMENT_OFFICER', 'VENDOR'), printInvoice);
router.post('/', authorize('ADMIN', 'PROCUREMENT_OFFICER', 'VENDOR'), validate(createInvoiceSchema), createInvoice);
router.put('/:id', authorize('ADMIN', 'PROCUREMENT_OFFICER', 'VENDOR'), validate(updateInvoiceSchema), updateInvoice);
router.post('/:id/email', authorize('ADMIN', 'PROCUREMENT_OFFICER'), sendInvoiceEmail);
router.delete('/:id', authorize('ADMIN', 'PROCUREMENT_OFFICER'), deleteInvoice);

export default router;
