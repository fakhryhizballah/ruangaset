import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { HttpError } from '../utils/http.js';

export function notFound(req, res, next) {
  next(new HttpError(404, `Endpoint tidak ditemukan: ${req.method} ${req.path}`));
}

export function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);
  if (error?.type === 'entity.parse.failed') return res.status(400).json({ error: 'Body JSON tidak valid.' });
  if (error?.type === 'entity.too.large') return res.status(413).json({ error: 'Ukuran body terlalu besar.' });
  if (error instanceof mongoose.Error.ValidationError) {
    return res.status(400).json({ error: 'Data tidak valid.', details: Object.values(error.errors).map((item) => item.message) });
  }
  if (error?.code === 11000) {
    const field = Object.keys(error.keyPattern || {})[0] || 'data';
    return res.status(409).json({ error: `Nilai ${field} sudah digunakan.` });
  }
  const status = error.status && Number.isInteger(error.status) ? error.status : 500;
  if (status >= 500) console.error({ requestId: req.id, error: error.message, stack: error.stack });
  const payload = { error: status >= 500 && env.isProduction ? 'Terjadi kesalahan pada server.' : error.message || 'Terjadi kesalahan.' };
  if (error.details && !env.isProduction) payload.details = error.details;
  if (req.id) payload.requestId = req.id;
  return res.status(status).json(payload);
}
