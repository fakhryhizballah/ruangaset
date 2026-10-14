import { Router } from 'express';
import { z } from 'zod';
import mongoose from 'mongoose';
import AssetType from '../models/AssetType.js';
import Asset from '../models/Asset.js';
import { requireAuth, allowRoles } from '../middleware/auth.js';
import { HttpError, parseBody, pageOptions } from '../utils/http.js';

const router = Router();
router.use(requireAuth);
const fields = {
  name: z.string().trim().min(2).max(100),
  code: z.string().trim().min(2).max(30).regex(/^[a-zA-Z0-9_-]+$/, 'Kode hanya boleh berisi huruf, angka, _ atau -').transform((v) => v.toUpperCase()),
  description: z.string().trim().max(500).optional().default(''),
};
const createSchema = z.object(fields);
const updateSchema = z.object({ name: fields.name.optional(), code: fields.code.optional(), description: fields.description.optional() })
  .refine((value) => Object.keys(value).length > 0, 'Tidak ada perubahan untuk disimpan.');

router.get('/', async (req, res) => {
  const { page, limit, skip } = pageOptions(req.query);
  const filter = {};
  const q = String(req.query.q || '').trim().slice(0, 100);
  if (q) {
    const safe = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter.$or = [{ name: { $regex: safe, $options: 'i' } }, { code: { $regex: safe, $options: 'i' } }];
  }
  const [items, total] = await Promise.all([AssetType.find(filter).sort({ name: 1 }).skip(skip).limit(limit).lean(), AssetType.countDocuments(filter)]);
  res.json({ data: { items, total, page, limit } });
});

router.post('/', allowRoles('admin', 'staff'), async (req, res) => {
  const data = parseBody(createSchema, req.body);
  const item = await AssetType.create({ ...data, createdBy: req.user._id });
  res.status(201).json({ data: { item } });
});

router.patch('/:id', allowRoles('admin', 'staff'), async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw new HttpError(400, 'ID jenis aset tidak valid.');
  const data = parseBody(updateSchema, req.body);
  const item = await AssetType.findByIdAndUpdate(req.params.id, { $set: data }, { new: true, runValidators: true });
  if (!item) throw new HttpError(404, 'Jenis aset tidak ditemukan.');
  res.json({ data: { item } });
});

router.delete('/:id', allowRoles('admin'), async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw new HttpError(400, 'ID jenis aset tidak valid.');
  const item = await AssetType.findById(req.params.id);
  if (!item) throw new HttpError(404, 'Jenis aset tidak ditemukan.');
  if (await Asset.exists({ type: item._id })) throw new HttpError(409, 'Jenis aset masih digunakan. Ubah jenis aset terkait sebelum menghapusnya.');
  await item.deleteOne();
  res.status(204).end();
});

export default router;
