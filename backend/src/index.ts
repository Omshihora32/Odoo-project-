import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { config } from './config';
import apiRouter from './routes';
import { errorHandler } from './middleware/errorHandler';

const app = express();

// Enable CORS
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:4173',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:4173',
  config.frontendUrl
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (
        !origin ||
        allowedOrigins.includes(origin) ||
        origin.startsWith('http://localhost:') ||
        origin.endsWith('.vercel.app')
      ) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Ensure upload directory exists (use /tmp on Vercel serverless)
const uploadDir = process.env.VERCEL
  ? '/tmp/uploads'
  : path.resolve(config.upload.dir);
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
// Serve uploaded files statically
app.use('/uploads', express.static(uploadDir));

// Mount API routes
app.use('/api', apiRouter);

// Base route health check
app.get('/health', (req, res) => {
  res.json({ success: true, status: 'OK', timestamp: new Date() });
});

// Global error handler (must be last)
app.use(errorHandler);

// Start server only when NOT running on Vercel (Vercel uses serverless functions)
if (!process.env.VERCEL) {
  const port = config.port || 5000;
  app.listen(port, () => {
    console.log(`[Server] Running in ${config.nodeEnv} mode on port ${port}`);
    console.log(`[Server] API endpoints available at http://localhost:${port}/api`);
  });
}

export default app;
