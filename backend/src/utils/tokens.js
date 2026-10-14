import { createHash, randomBytes } from 'node:crypto';
import jwt from 'jsonwebtoken';
import RefreshToken from '../models/RefreshToken.js';
import { env } from '../config/env.js';

export const hashToken = (token) => createHash('sha256').update(token).digest('hex');

export function createAccessToken(user) {
  return jwt.sign({ email: user.email, role: user.role }, env.jwtPrivateKey, {
    algorithm: 'RS256', subject: String(user._id), expiresIn: env.jwtAccessTtl,
    issuer: env.jwtIssuer, audience: env.jwtAudience,
  });
}

export async function issueRefreshToken(userId) {
  const token = randomBytes(48).toString('base64url');
  const expiresAt = new Date(Date.now() + env.refreshTokenDays * 24 * 60 * 60 * 1000);
  await RefreshToken.create({ user: userId, tokenHash: hashToken(token), expiresAt });
  return { token, expiresAt };
}

export function setRefreshCookie(res, token, expiresAt) {
  res.cookie(env.cookieName, token, {
    httpOnly: true,
    secure: env.isProduction,
    sameSite: env.cookieSameSite,
    domain: env.cookieDomain,
    path: '/api/auth',
    expires: expiresAt,
    priority: 'high',
  });
}

export function clearRefreshCookie(res) {
  res.clearCookie(env.cookieName, {
    httpOnly: true, secure: env.isProduction, sameSite: env.cookieSameSite,
    domain: env.cookieDomain, path: '/api/auth',
  });
}
