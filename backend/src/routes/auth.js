import { Router } from 'express';
import bcrypt from 'bcrypt';
import { z } from 'zod';
import User from '../models/User.js';
import RefreshToken from '../models/RefreshToken.js';
import { env } from '../config/env.js';
import { requireAuth } from '../middleware/auth.js';
import { HttpError, parseBody, publicUser } from '../utils/http.js';
import { clearRefreshCookie, createAccessToken, hashToken, issueRefreshToken, setRefreshCookie } from '../utils/tokens.js';

const router = Router();
const credentials = z.object({ email: z.string().trim().email().max(254).transform((v) => v.toLowerCase()), password: z.string().min(1).max(72) });
const registration = credentials.extend({ name: z.string().trim().min(2).max(120), password: z.string().min(12).max(72) });

async function finishLogin(user, res) {
  const { token, expiresAt } = await issueRefreshToken(user._id);
  setRefreshCookie(res, token, expiresAt);
  return { accessToken: createAccessToken(user), user: publicUser(user) };
}

router.post('/register', async (req, res) => {
  if (!env.registerEnabled) throw new HttpError(403, 'Registrasi dinonaktifkan oleh administrator.');
  const data = parseBody(registration, req.body);
  if (Buffer.byteLength(data.password, 'utf8') > 72) throw new HttpError(400, 'Password maksimal 72 byte.');
  const user = await User.create({ email: data.email, name: data.name, passwordHash: await bcrypt.hash(data.password, 12), role: 'viewer' });
  res.status(201).json({ data: await finishLogin(user, res) });
});

router.post('/login', async (req, res) => {
  const data = parseBody(credentials, req.body);
  if (Buffer.byteLength(data.password, 'utf8') > 72) throw new HttpError(400, 'Password maksimal 72 byte.');
  const user = await User.findOne({ email: data.email }).select('+passwordHash');
  if (!user || !user.active || !(await bcrypt.compare(data.password, user.passwordHash))) {
    throw new HttpError(401, 'Email atau password tidak benar.');
  }
  user.lastLoginAt = new Date();
  await user.save();
  res.json({ data: await finishLogin(user, res) });
});

router.post('/refresh', async (req, res) => {
  const current = req.cookies?.[env.cookieName];
  if (!current) throw new HttpError(401, 'Sesi telah berakhir. Silakan masuk kembali.');
  const stored = await RefreshToken.findOne({ tokenHash: hashToken(current), revokedAt: null, expiresAt: { $gt: new Date() } }).select('+tokenHash');
  if (!stored) {
    clearRefreshCookie(res);
    throw new HttpError(401, 'Sesi telah berakhir. Silakan masuk kembali.');
  }
  // Rotate single-use refresh token to limit replay after a token is stolen.
  stored.revokedAt = new Date();
  await stored.save();
  const user = await User.findById(stored.user).select('_id name email role active');
  if (!user || !user.active) {
    clearRefreshCookie(res);
    throw new HttpError(401, 'Akun tidak aktif.');
  }
  const { token, expiresAt } = await issueRefreshToken(user._id);
  setRefreshCookie(res, token, expiresAt);
  res.json({ data: { accessToken: createAccessToken(user), user: publicUser(user) } });
});

router.post('/logout', async (req, res) => {
  const token = req.cookies?.[env.cookieName];
  if (token) await RefreshToken.updateOne({ tokenHash: hashToken(token), revokedAt: null }, { $set: { revokedAt: new Date() } });
  clearRefreshCookie(res);
  res.status(204).end();
});

router.get('/me', requireAuth, (req, res) => res.json({ data: { user: publicUser(req.user) } }));

export default router;
