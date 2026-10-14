import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { env } from '../config/env.js';
import { HttpError } from '../utils/http.js';

export async function requireAuth(req, res, next) {
  const authorization = req.get('authorization') || '';
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : null;
  if (!token) return next(new HttpError(401, 'Silakan masuk untuk melanjutkan.'));

  let claims;
  try {
    claims = jwt.verify(token, env.jwtPublicKey, {
      algorithms: ['RS256'], issuer: env.jwtIssuer, audience: env.jwtAudience,
    });
  } catch {
    return next(new HttpError(401, 'Sesi tidak berlaku. Silakan masuk kembali.'));
  }

  // Database exceptions are intentionally left to Express's error handler (not misreported as 401).
  const user = await User.findById(claims.sub).select('_id name email role active');
  if (!user || !user.active) return next(new HttpError(401, 'Akun tidak aktif atau sesi tidak berlaku.'));
  req.user = user;
  return next();
}

export function allowRoles(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) return next(new HttpError(403, 'Anda tidak memiliki izin untuk tindakan ini.'));
    next();
  };
}
