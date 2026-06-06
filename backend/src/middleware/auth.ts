import { Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';
import { AuthRequest, AppError } from '../types';

export function authenticate(req: AuthRequest, res: Response, next: NextFunction): void {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('Authentication required. Please provide a valid token.', 401);
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
      throw new AppError('Authentication required. Please provide a valid token.', 401);
    }

    const decoded = verifyToken(token);
    req.user = decoded;
    next();
  } catch (error: any) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ success: false, message: error.message });
      return;
    }
    if (error.name === 'JsonWebTokenError') {
      res.status(401).json({ success: false, message: 'Invalid token.' });
      return;
    }
    if (error.name === 'TokenExpiredError') {
      res.status(401).json({ success: false, message: 'Token expired. Please login again.' });
      return;
    }
    res.status(401).json({ success: false, message: 'Authentication failed.' });
  }
}
