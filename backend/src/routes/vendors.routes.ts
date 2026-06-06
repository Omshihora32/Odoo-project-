import { Router } from 'express';
import { getVendors, getVendorById, createVendor, updateVendor, deleteVendor } from '../controllers/vendors.controller';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/rbac';
import { validate } from '../middleware/validate';
import { createVendorSchema, updateVendorSchema } from '../validators/vendor.validator';

const router = Router();

router.use(authenticate);

router.get('/', authorize('ADMIN', 'PROCUREMENT_OFFICER'), getVendors);
router.get('/:id', authorize('ADMIN', 'PROCUREMENT_OFFICER', 'MANAGER', 'VENDOR'), getVendorById);
router.post('/', authorize('ADMIN', 'PROCUREMENT_OFFICER'), validate(createVendorSchema), createVendor);
router.put('/:id', authorize('ADMIN', 'PROCUREMENT_OFFICER', 'VENDOR'), validate(updateVendorSchema), updateVendor);
router.delete('/:id', authorize('ADMIN'), deleteVendor);

export default router;
