import { Router } from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';
import User from '../models/User.js';
import RefreshToken from '../models/RefreshToken.js';
import { requireAuth, allowRoles } from '../middleware/auth.js';
import { HttpError, parseBody, pageOptions, publicUser } from '../utils/http.js';

const router = Router();
router.use(requireAuth, allowRoles('admin'));
router.get('/', async (req, res) => {
  const { page, limit, skip } = pageOptions(req.query);
  const [users, total] = await Promise.all([
    User.find().select('_id name email role active lastLoginAt createdAt').sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    User.countDocuments(),
  ]);
  res.json({ data: { items: users.map((user) => ({ ...user, id: String(user._id) })), total, page, limit } });
});

router.patch('/:id', async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw new HttpError(400, 'ID pengguna tidak valid.');
  const schema = z.object({ role: z.enum(['admin', 'staff', 'viewer']).optional(), active: z.boolean().optional() })
    .refine((value) => Object.keys(value).length > 0, 'Pilih peran atau status yang akan diubah.');
  const data = parseBody(schema, req.body);
  const target = await User.findById(req.params.id);
  if (!target) throw new HttpError(404, 'Pengguna tidak ditemukan.');
  if (String(target._id) === String(req.user._id) && data.active === false) {
    throw new HttpError(400, 'Anda tidak dapat menonaktifkan akun sendiri.');
  }
  if (String(target._id) === String(req.user._id) && data.role && data.role !== 'admin') {
    throw new HttpError(400, 'Anda tidak dapat menurunkan peran akun sendiri.');
  }
  if (data.active === false && target.active) {
    await RefreshToken.updateMany({ user: target._id, revokedAt: null }, { $set: { revokedAt: new Date() } });
  }
  if (data.role) target.role = data.role;
  if (data.active !== undefined) target.active = data.active;
  await target.save();
  res.json({ data: { item: publicUser(target) } });
});

export default router;
