import { Router } from 'express';
import authRoutes from './auth.routes';
import userRoutes from './users.routes';
import vendorRoutes from './vendors.routes';
import rfqRoutes from './rfqs.routes';
import quotationRoutes from './quotations.routes';
import approvalRoutes from './approvals.routes';
import purchaseOrderRoutes from './purchaseOrders.routes';
import invoiceRoutes from './invoices.routes';
import reportRoutes from './reports.routes';
import activityRoutes from './activities.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/vendors', vendorRoutes);
router.use('/rfqs', rfqRoutes);
router.use('/quotations', quotationRoutes);
router.use('/approvals', approvalRoutes);
router.use('/purchase-orders', purchaseOrderRoutes);
router.use('/invoices', invoiceRoutes);
router.use('/reports', reportRoutes);
router.use('/', activityRoutes); // mounts /activity-logs and /notifications

export default router;
