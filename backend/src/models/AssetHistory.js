import mongoose from 'mongoose';

const historySchema = new mongoose.Schema({
  assetId: { type: mongoose.Schema.Types.ObjectId, ref: 'Asset', required: true, index: true },
  assetName: { type: String, required: true, maxlength: 180 },
  changeType: { type: String, enum: ['create', 'name', 'type', 'location', 'condition', 'manualParams', 'notes', 'delete'], required: true, index: true },
  oldValue: { type: mongoose.Schema.Types.Mixed, default: null },
  newValue: { type: mongoose.Schema.Types.Mixed, default: null },
  changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: { createdAt: true, updatedAt: false }, versionKey: false });
historySchema.index({ createdAt: -1 });
export default mongoose.model('AssetHistory', historySchema);
