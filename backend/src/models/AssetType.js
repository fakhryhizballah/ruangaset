import mongoose from 'mongoose';

const assetTypeSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  code: { type: String, required: true, trim: true, uppercase: true, maxlength: 30 },
  description: { type: String, trim: true, maxlength: 500, default: '' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true, versionKey: false });
assetTypeSchema.index({ code: 1 }, { unique: true });
assetTypeSchema.index({ name: 1 });
export default mongoose.model('AssetType', assetTypeSchema);
