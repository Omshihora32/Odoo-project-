import { Request, Response, NextFunction } from 'express';
import { AppError } from '../types';
import { config } from '../config';

export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
    });
    return;
  }

  // Prisma known errors
  if ((err as any).code === 'P2002') {
    const target = (err as any).meta?.target;
    res.status(409).json({
      success: false,
      message: `A record with this ${target ? target.join(', ') : 'value'} already exists.`,
    });
    return;
  }

  if ((err as any).code === 'P2025') {
    res.status(404).json({
      success: false,
      message: 'Record not found.',
    });
    return;
  }

  // Multer errors
  if (err.name === 'MulterError') {
    res.status(400).json({
      success: false,
      message: `File upload error: ${err.message}`,
    });
    return;
  }

  console.error('Unhandled error:', err);

  res.status(500).json({
    success: false,
    message: config.nodeEnv === 'development' ? err.message : 'Internal server error.',
  });
}
