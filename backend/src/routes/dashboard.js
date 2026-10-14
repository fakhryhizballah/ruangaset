import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import Asset, { CONDITIONS } from '../models/Asset.js';
import Location from '../models/Location.js';
import AssetType from '../models/AssetType.js';
import AssetHistory from '../models/AssetHistory.js';

const router = Router();
router.use(requireAuth);
router.get('/stats', async (req, res) => {
  const [totalAssets, totalLocations, totalTypes, byCondition, byType, byLocation, latestHistory] = await Promise.all([
    Asset.countDocuments(), Location.countDocuments(), AssetType.countDocuments(),
    Asset.aggregate([{ $group: { _id: '$condition', count: { $sum: 1 } } }]),
    Asset.aggregate([{ $group: { _id: '$type', count: { $sum: 1 } } }, { $sort: { count: -1 } }, { $lookup: { from: 'assettypes', localField: '_id', foreignField: '_id', as: 'type' } }, { $unwind: { path: '$type', preserveNullAndEmptyArrays: true } }, { $project: { _id: 0, id: { $toString: '$_id' }, name: { $ifNull: ['$type.name', 'Jenis dihapus'] }, count: 1 } }]),
    Asset.aggregate([{ $group: { _id: '$location', count: { $sum: 1 } } }, { $sort: { count: -1 } }, { $limit: 8 }, { $lookup: { from: 'locations', localField: '_id', foreignField: '_id', as: 'location' } }, { $unwind: { path: '$location', preserveNullAndEmptyArrays: true } }, { $project: { _id: 0, name: { $ifNull: ['$location.name', 'Lokasi dihapus'] }, count: 1 } }]),
    AssetHistory.find().sort({ createdAt: -1 }).limit(8).populate('changedBy', 'name').populate('assetId', 'qrId name type location condition').lean(),
  ]);
  const conditionCounts = Object.fromEntries(CONDITIONS.map((condition) => [condition, 0]));
  for (const row of byCondition) conditionCounts[row._id] = row.count;
  res.json({ data: { totalAssets, totalLocations, totalTypes, byCondition: conditionCounts, byType, byLocation, latestHistory } });
});
export default router;
