import { Router } from 'express';
import mongoose from 'mongoose';
import ExcelJS from 'exceljs';
import { z } from 'zod';
import Asset, { CONDITIONS } from '../models/Asset.js';
import AssetType from '../models/AssetType.js';
import Location from '../models/Location.js';
import AssetHistory from '../models/AssetHistory.js';
import { requireAuth, allowRoles } from '../middleware/auth.js';
import { HttpError, parseBody, pageOptions } from '../utils/http.js';

const router = Router();
const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'ID tidak valid.');
const primitiveParam = z.union([z.string().max(500), z.number().finite(), z.boolean()]);
const paramsSchema = z.record(z.string().trim().min(1).max(80), primitiveParam).optional().default({});
const createSchema = z.object({
  qrId: z.string().trim().min(2).max(100).transform((v) => v.toUpperCase()),
  name: z.string().trim().min(2).max(180),
  typeId: objectId,
  locationId: objectId,
  condition: z.enum(CONDITIONS).optional().default('Baik'),
  manualParams: paramsSchema,
  notes: z.string().trim().max(2000).optional().default(''),
});
const updateSchema = z.object({
  qrId: createSchema.shape.qrId.optional(),
  name: createSchema.shape.name.optional(),
  typeId: objectId.optional(),
  locationId: objectId.optional(),
  condition: z.enum(CONDITIONS).optional(),
  manualParams: paramsSchema.optional(),
  notes: z.string().trim().max(2000).optional(),
}).refine((value) => Object.keys(value).length > 0, 'Tidak ada perubahan untuk disimpan.');

function cleanParams(params = {}) {
  return Object.fromEntries(Object.entries(params).map(([key, value]) => [key.trim(), String(value).trim()]).filter(([key, value]) => key && value));
}
function buildAssetFilter(query) {
  const filter = {};
  if (query.condition && CONDITIONS.includes(String(query.condition))) filter.condition = String(query.condition);
  if (query.locationId && mongoose.isValidObjectId(String(query.locationId))) filter.location = String(query.locationId);
  if (query.typeId && mongoose.isValidObjectId(String(query.typeId))) filter.type = String(query.typeId);
  const q = String(query.q || '').trim().slice(0, 100);
  if (q) {
    const safe = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter.$or = [
      { name: { $regex: safe, $options: 'i' } },
      { qrId: { $regex: safe, $options: 'i' } },
      { notes: { $regex: safe, $options: 'i' } },
    ];
  }
  return filter;
}
function populateAsset(query) {
  return query.populate('type', 'name code').populate('location', 'name code address');
}
async function assertReferences(typeId, locationId) {
  const [type, location] = await Promise.all([AssetType.findById(typeId), Location.findById(locationId)]);
  if (!type) throw new HttpError(400, 'Jenis aset tidak ditemukan. Buat jenis aset terlebih dahulu.');
  if (!location) throw new HttpError(400, 'Lokasi tidak ditemukan. Buat lokasi terlebih dahulu.');
  return { type, location };
}
async function addHistory(assetId, assetName, changeType, oldValue, newValue, userId) {
  await AssetHistory.create({ assetId, assetName, changeType, oldValue, newValue, changedBy: userId });
}

// Public route is intentionally restricted to a small allowlist of fields.
router.get('/public/:locationId', async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.locationId)) throw new HttpError(404, 'Tautan lokasi tidak valid.');
  const location = await Location.findOne({ _id: req.params.locationId, publicEnabled: true }).select('name code address').lean();
  if (!location) throw new HttpError(404, 'Tautan publik tidak tersedia atau telah dinonaktifkan.');
  const items = await Asset.find({ location: location._id }).sort({ name: 1 }).limit(1000)
    .populate('type', 'name').select('qrId name type condition updatedAt').lean();
  res.set('Cache-Control', 'public, max-age=30, stale-while-revalidate=60');
  res.json({ data: { location, items: items.map((asset) => ({
    id: String(asset._id), qrId: asset.qrId, name: asset.name,
    type: asset.type?.name || '—', condition: asset.condition, updatedAt: asset.updatedAt,
  })) } });
});

router.use(requireAuth);

router.get('/export.xlsx', async (req, res) => {
  const filter = buildAssetFilter(req.query);
  const count = await Asset.countDocuments(filter);
  if (count > 10000) throw new HttpError(413, 'Ekspor dibatasi 10.000 aset per file. Gunakan filter untuk memperkecil hasil.');
  const items = await populateAsset(Asset.find(filter).sort({ name: 1 })).lean();
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'RuangAset';
  workbook.created = new Date();
  const sheet = workbook.addWorksheet('Daftar Aset');
  sheet.columns = [
    { header: 'ID QR', key: 'qrId', width: 20 }, { header: 'Nama Aset', key: 'name', width: 34 },
    { header: 'Jenis Aset', key: 'type', width: 22 }, { header: 'Lokasi', key: 'location', width: 28 },
    { header: 'Kondisi', key: 'condition', width: 18 }, { header: 'Parameter Manual', key: 'params', width: 40 },
    { header: 'Catatan', key: 'notes', width: 44 }, { header: 'Dibuat', key: 'createdAt', width: 24 },
    { header: 'Diperbarui', key: 'updatedAt', width: 24 },
  ];
  sheet.getRow(1).font = { bold: true };
  for (const asset of items) sheet.addRow({
    qrId: asset.qrId, name: asset.name, type: asset.type?.name || '', location: asset.location?.name || '',
    condition: asset.condition, params: Object.entries(asset.manualParams || {}).map(([key, value]) => `${key}: ${value}`).join('; '),
    notes: asset.notes || '', createdAt: asset.createdAt?.toISOString(), updatedAt: asset.updatedAt?.toISOString(),
  });
  sheet.autoFilter = { from: 'A1', to: 'I1' };
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="ruangaset-${new Date().toISOString().slice(0, 10)}.xlsx"`);
  await workbook.xlsx.write(res);
  res.end();
});

router.get('/history', async (req, res) => {
  const { page, limit, skip } = pageOptions(req.query);
  const [items, total] = await Promise.all([
    AssetHistory.find().sort({ createdAt: -1 }).skip(skip).limit(limit).populate('changedBy', 'name email').populate('assetId', 'qrId name').lean(),
    AssetHistory.countDocuments(),
  ]);
  res.json({ data: { items, total, page, limit } });
});

router.get('/', async (req, res) => {
  const { page, limit, skip } = pageOptions(req.query);
  const filter = buildAssetFilter(req.query);
  const sortKey = ['name', 'createdAt', 'updatedAt'].includes(String(req.query.sort)) ? String(req.query.sort) : 'updatedAt';
  const sort = { [sortKey]: req.query.order === 'asc' ? 1 : -1 };
  const [items, total] = await Promise.all([
    populateAsset(Asset.find(filter).sort(sort).skip(skip).limit(limit)).lean(),
    Asset.countDocuments(filter),
  ]);
  res.json({ data: { items, total, page, limit } });
});

router.post('/', allowRoles('admin', 'staff'), async (req, res) => {
  const data = parseBody(createSchema, req.body);
  await assertReferences(data.typeId, data.locationId);
  const item = await Asset.create({
    qrId: data.qrId, name: data.name, type: data.typeId, location: data.locationId,
    condition: data.condition, manualParams: cleanParams(data.manualParams), notes: data.notes,
    createdBy: req.user._id, updatedBy: req.user._id,
  });
  await addHistory(item._id, item.name, 'create', null, { qrId: item.qrId, name: item.name, condition: item.condition }, req.user._id);
  const populated = await populateAsset(Asset.findById(item._id)).lean();
  res.status(201).json({ data: { item: populated } });
});

router.get('/:id/history', async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw new HttpError(400, 'ID aset tidak valid.');
  if (!(await Asset.exists({ _id: req.params.id }))) throw new HttpError(404, 'Aset tidak ditemukan.');
  const items = await AssetHistory.find({ assetId: req.params.id }).sort({ createdAt: -1 }).limit(200).populate('changedBy', 'name email').lean();
  res.json({ data: { items } });
});

router.get('/:id', async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw new HttpError(400, 'ID aset tidak valid.');
  const item = await populateAsset(Asset.findById(req.params.id)).lean();
  if (!item) throw new HttpError(404, 'Aset tidak ditemukan.');
  res.json({ data: { item } });
});

router.patch('/:id', allowRoles('admin', 'staff'), async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw new HttpError(400, 'ID aset tidak valid.');
  const data = parseBody(updateSchema, req.body);
  const item = await populateAsset(Asset.findById(req.params.id));
  if (!item) throw new HttpError(404, 'Aset tidak ditemukan.');
  const old = {
    qrId: item.qrId, name: item.name,
    typeId: String(item.type._id), typeName: item.type.name,
    locationId: String(item.location._id), locationName: item.location.name,
    condition: item.condition, manualParams: { ...(item.manualParams || {}) }, notes: item.notes || '',
  };
  if (data.typeId || data.locationId) await assertReferences(data.typeId || old.typeId, data.locationId || old.locationId);
  if (data.qrId !== undefined) item.qrId = data.qrId;
  if (data.name !== undefined) item.name = data.name;
  if (data.typeId !== undefined) item.type = data.typeId;
  if (data.locationId !== undefined) item.location = data.locationId;
  if (data.condition !== undefined) item.condition = data.condition;
  if (data.manualParams !== undefined) item.manualParams = cleanParams(data.manualParams);
  if (data.notes !== undefined) item.notes = data.notes;
  item.updatedBy = req.user._id;
  await item.save();
  const typeChanged = data.typeId && data.typeId !== old.typeId;
  const locationChanged = data.locationId && data.locationId !== old.locationId;
  const comparisons = [
    ['name', old.name, item.name, data.name !== undefined && old.name !== item.name],
    ['type', old.typeName, null, Boolean(typeChanged)],
    ['location', old.locationName, null, Boolean(locationChanged)],
    ['condition', old.condition, item.condition, data.condition !== undefined && old.condition !== item.condition],
    ['manualParams', old.manualParams, { ...(item.manualParams || {}) }, data.manualParams !== undefined && JSON.stringify(old.manualParams) !== JSON.stringify(item.manualParams)],
    ['notes', old.notes, item.notes, data.notes !== undefined && old.notes !== item.notes],
  ];
  const populated = await populateAsset(Asset.findById(item._id)).lean();
  for (const [field, oldValue, newValue, changed] of comparisons) {
    if (!changed) continue;
    const actualNew = field === 'type' ? populated.type?.name : field === 'location' ? populated.location?.name : newValue;
    await addHistory(item._id, populated.name, field, oldValue, actualNew, req.user._id);
  }
  res.json({ data: { item: populated } });
});

router.delete('/:id', allowRoles('admin'), async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw new HttpError(400, 'ID aset tidak valid.');
  const item = await Asset.findById(req.params.id);
  if (!item) throw new HttpError(404, 'Aset tidak ditemukan.');
  await AssetHistory.create({ assetId: item._id, assetName: item.name, changeType: 'delete', oldValue: 'Aset aktif', newValue: 'Aset dihapus', changedBy: req.user._id });
  await item.deleteOne();
  res.status(204).end();
});

export default router;
