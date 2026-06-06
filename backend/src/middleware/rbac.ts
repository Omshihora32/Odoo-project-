import { Response, NextFunction } from 'express';
import { Role } from '@prisma/client';
import { AuthRequest } from '../types';

export function authorize(...roles: Role[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required.' });
      return;
    }

    if (roles.length > 0 && !roles.includes(req.user.role as Role)) {
      res.status(403).json({
        success: false,
        message: 'You do not have permission to perform this action.',
      });
      return;
    }

    next();
  };
}
