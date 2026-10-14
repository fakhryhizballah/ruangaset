import mongoose from 'mongoose';

export const CONDITIONS = ['Baik', 'Rusak', 'Perbaikan', 'Upgrade', 'DiPerbaiki'];
const assetSchema = new mongoose.Schema({
  qrId: { type: String, required: true, unique: true, trim: true, uppercase: true, maxlength: 100 },
  name: { type: String, required: true, trim: true, maxlength: 180, index: true },
  type: { type: mongoose.Schema.Types.ObjectId, ref: 'AssetType', required: true, index: true },
  location: { type: mongoose.Schema.Types.ObjectId, ref: 'Location', required: true, index: true },
  condition: { type: String, enum: CONDITIONS, default: 'Baik', index: true },
  manualParams: { type: mongoose.Schema.Types.Mixed, default: () => ({}) },
  notes: { type: String, trim: true, maxlength: 2000, default: '' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true, versionKey: false });
assetSchema.index({ updatedAt: -1 });
assetSchema.index({ location: 1, condition: 1 });
assetSchema.index({ type: 1, condition: 1 });
assetSchema.index({ name: 'text', qrId: 'text' });
export default mongoose.model('Asset', assetSchema);
