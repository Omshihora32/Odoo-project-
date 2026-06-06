import { Router } from 'express';
import { getUsers, getUserById, createUser, updateUser, deleteUser } from '../controllers/users.controller';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/rbac';
import { validate } from '../middleware/validate';
import { registerSchema } from '../validators/auth.validator';

const router = Router();

router.use(authenticate);
router.use(authorize('ADMIN'));

router.get('/', getUsers);
router.get('/:id', getUserById);
router.post('/', validate(registerSchema), createUser);
router.put('/:id', updateUser);
router.delete('/:id', deleteUser);

export default router;
