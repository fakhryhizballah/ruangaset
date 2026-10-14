import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { rateLimit } from 'express-rate-limit';
import { randomUUID } from 'node:crypto';
import mongoose from 'mongoose';
import { env } from './config/env.js';
import { notFound, errorHandler } from './middleware/errorHandler.js';
import { HttpError } from './utils/http.js';
import authRoutes from './routes/auth.js';
import assetRoutes from './routes/assets.js';
import locationRoutes from './routes/locations.js';
import assetTypeRoutes from './routes/assetTypes.js';
import dashboardRoutes from './routes/dashboard.js';
import userRoutes from './routes/users.js';

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', env.isProduction ? 1 : false);

app.use((req, res, next) => {
  const suppliedRequestId = req.get('x-request-id') || '';
  req.id = /^[a-zA-Z0-9_-]{1,100}$/.test(suppliedRequestId) ? suppliedRequestId : randomUUID();
  res.setHeader('X-Request-Id', req.id);
  next();
});
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  referrerPolicy: { policy: 'no-referrer' },
}));
app.use(cors({
  origin(origin, callback) {
    if (!origin || env.corsOrigins.includes(origin)) return callback(null, true);
    return callback(new HttpError(403, 'Origin tidak diizinkan oleh CORS.'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
  maxAge: 600,
}));
app.use(compression());
app.use(express.json({ limit: '1mb', strict: true }));
app.use(express.urlencoded({ extended: false, limit: '32kb' }));
app.use(cookieParser());

const generalLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 300, standardHeaders: 'draft-8', legacyHeaders: false, handler: (req, res) => res.status(429).json({ error: 'Terlalu banyak permintaan. Coba lagi beberapa saat.', requestId: req.id }) });
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 12, standardHeaders: 'draft-8', legacyHeaders: false, handler: (req, res) => res.status(429).json({ error: 'Terlalu banyak percobaan autentikasi. Coba lagi beberapa saat.', requestId: req.id }) });
app.use('/api', generalLimiter);
app.get('/healthz', (req, res) => {
  const ready = mongoose.connection.readyState === 1;
  res.status(ready ? 200 : 503).json({ status: ready ? 'ok' : 'degraded', database: ready ? 'connected' : 'disconnected', service: env.appName, timestamp: new Date().toISOString() });
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth', authRoutes);
app.use('/api/assets', assetRoutes);
app.use('/api/locations', locationRoutes);
app.use('/api/asset-types', assetTypeRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/users', userRoutes);
app.use('/api', notFound);
app.use(errorHandler);

export default app;
