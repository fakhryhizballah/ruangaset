import bcrypt from 'bcrypt';
import mongoose from 'mongoose';
import { env } from '../src/config/env.js';
import User from '../src/models/User.js';

const email = String(process.env.SEED_ADMIN_EMAIL || '').trim().toLowerCase();
const password = String(process.env.SEED_ADMIN_PASSWORD || '');
const name = String(process.env.SEED_ADMIN_NAME || 'Administrator').trim();
if (!email || !email.includes('@')) throw new Error('Isi SEED_ADMIN_EMAIL di backend/.env dengan email yang valid.');
if (password.length < 12 || Buffer.byteLength(password, 'utf8') > 72) throw new Error('SEED_ADMIN_PASSWORD wajib 12–72 byte.');

try {
  await mongoose.connect(env.mongoUri, { serverSelectionTimeoutMS: 10000 });
  const existing = await User.findOne({ email });
  if (existing) {
    console.log(`Akun ${email} sudah ada. Seed tidak mengubah akun yang sudah terdaftar.`);
  } else {
    await User.create({ email, name, role: 'admin', passwordHash: await bcrypt.hash(password, 12), active: true });
    console.log(`Akun admin ${email} berhasil dibuat.`);
  }
} finally {
  await mongoose.disconnect();
}
