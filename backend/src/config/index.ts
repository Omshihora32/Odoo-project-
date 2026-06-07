import dotenv from 'dotenv';
import path from 'path';

// In Vercel serverless, __dirname may not resolve as expected.
// Try multiple paths to find .env file; Vercel uses env vars from dashboard anyway.
if (!process.env.VERCEL) {
  dotenv.config({ path: path.resolve(__dirname, '../../.env') });
  dotenv.config({ path: path.resolve(process.cwd(), '.env') });
}

export const config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '5000', 10),

  database: {
    url: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/vendorbridge?schema=public',
  },

  jwt: {
    secret: process.env.JWT_SECRET || 'vendorbridge-dev-secret',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },

  smtp: {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.SMTP_FROM || 'VendorBridge <noreply@vendorbridge.com>',
  },

  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',

  upload: {
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '5242880', 10),
    dir: process.env.UPLOAD_DIR || './uploads',
  },
};
