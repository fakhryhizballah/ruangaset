import mongoose from 'mongoose';

const locationSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 120 },
  code: { type: String, required: true, trim: true, uppercase: true, maxlength: 30 },
  address: { type: String, trim: true, maxlength: 240, default: '' },
  description: { type: String, trim: true, maxlength: 500, default: '' },
  publicEnabled: { type: Boolean, default: false },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true, versionKey: false });
locationSchema.index({ code: 1 }, { unique: true });
locationSchema.index({ name: 1 });
export default mongoose.model('Location', locationSchema);
