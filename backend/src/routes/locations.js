import { Router } from 'express';
import { z } from 'zod';
import mongoose from 'mongoose';
import Location from '../models/Location.js';
import Asset from '../models/Asset.js';
import AssetHistory from '../models/AssetHistory.js';
import { requireAuth, allowRoles } from '../middleware/auth.js';
import { HttpError, parseBody, pageOptions } from '../utils/http.js';

const router = Router();
router.use(requireAuth);
const locationFields = {
  name: z.string().trim().min(2).max(120),
  code: z.string().trim().min(2).max(30).regex(/^[a-zA-Z0-9_-]+$/, 'Kode hanya boleh berisi huruf, angka, _ atau -').transform((v) => v.toUpperCase()),
  address: z.string().trim().max(240).optional().default(''),
  description: z.string().trim().max(500).optional().default(''),
};
const createSchema = z.object(locationFields);
const updateSchema = z.object({
  name: locationFields.name.optional(), code: locationFields.code.optional(),
  address: locationFields.address.optional(), description: locationFields.description.optional(),
  publicEnabled: z.boolean().optional(),
}).refine((value) => Object.keys(value).length > 0, 'Tidak ada perubahan untuk disimpan.');

router.get('/', async (req, res) => {
  const { page, limit, skip } = pageOptions(req.query);
  const filter = {};
  const q = String(req.query.q || '').trim().slice(0, 100);
  if (q) filter.$or = [ { name: { $regex: q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' } }, { code: { $regex: q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' } } ];
  const [items, total] = await Promise.all([
    Location.find(filter).sort({ name: 1 }).skip(skip).limit(limit).lean(),
    Location.countDocuments(filter),
  ]);
  res.json({ data: { items, total, page, limit } });
});

router.post('/', allowRoles('admin', 'staff'), async (req, res) => {
  const data = parseBody(createSchema, req.body);
  const location = await Location.create({ ...data, createdBy: req.user._id });
  res.status(201).json({ data: { item: location } });
});

router.patch('/:id', allowRoles('admin', 'staff'), async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw new HttpError(400, 'ID lokasi tidak valid.');
  const data = parseBody(updateSchema, req.body);
  const location = await Location.findByIdAndUpdate(req.params.id, { $set: data }, { new: true, runValidators: true });
  if (!location) throw new HttpError(404, 'Lokasi tidak ditemukan.');
  res.json({ data: { item: location } });
});

router.delete('/:id', allowRoles('admin'), async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw new HttpError(400, 'ID lokasi tidak valid.');
  const location = await Location.findById(req.params.id);
  if (!location) throw new HttpError(404, 'Lokasi tidak ditemukan.');
  if (await Asset.exists({ location: location._id })) throw new HttpError(409, 'Lokasi masih digunakan oleh aset. Pindahkan aset sebelum menghapus lokasi.');
  await location.deleteOne();
  res.status(204).end();
});

router.get('/:id/history', async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw new HttpError(400, 'ID lokasi tidak valid.');
  const location = await Location.findById(req.params.id).lean();
  if (!location) throw new HttpError(404, 'Lokasi tidak ditemukan.');
  const assets = await Asset.find({ location: location._id }).select('_id').lean();
  const assetIds = assets.map((asset) => asset._id);
  const history = await AssetHistory.find({ $or: [ { assetId: { $in: assetIds } }, { changeType: 'location', oldValue: location.name }, { changeType: 'location', newValue: location.name } ] }).sort({ createdAt: -1 }).limit(100).populate('changedBy', 'name email').lean();
  res.json({ data: { items: history } });
});

export default router;
