import mongoose from 'mongoose';
import { env } from '../src/config/env.js';
import User from '../src/models/User.js';
import RefreshToken from '../src/models/RefreshToken.js';
import Location from '../src/models/Location.js';
import AssetType from '../src/models/AssetType.js';
import Asset from '../src/models/Asset.js';
import AssetHistory from '../src/models/AssetHistory.js';

try {
  await mongoose.connect(env.mongoUri, { serverSelectionTimeoutMS: 10000 });
  await Promise.all([User, RefreshToken, Location, AssetType, Asset, AssetHistory].map((Model) => Model.createIndexes()));
  console.log('Semua indeks MongoDB berhasil dibuat/diverifikasi.');
} finally {
  await mongoose.disconnect();
}
