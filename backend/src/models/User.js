import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 254 },
  passwordHash: { type: String, required: true, select: false },
  name: { type: String, required: true, trim: true, maxlength: 120 },
  role: { type: String, enum: ['admin', 'staff', 'viewer'], default: 'viewer', index: true },
  active: { type: Boolean, default: true, index: true },
  lastLoginAt: { type: Date },
}, { timestamps: true, versionKey: false });

export default mongoose.model('User', userSchema);
