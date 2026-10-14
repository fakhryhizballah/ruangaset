import 'dotenv/config';
import { createPrivateKey, createPublicKey } from 'node:crypto';

const required = ['MONGODB_URI', 'JWT_PRIVATE_KEY', 'JWT_PUBLIC_KEY'];
for (const key of required) {
  if (!process.env[key]?.trim()) throw new Error(`Missing required environment variable: ${key}`);
}

const normalizeKey = (value) => value.replace(/\\n/g, '\n').trim();
const privatePem = normalizeKey(process.env.JWT_PRIVATE_KEY);
const publicPem = normalizeKey(process.env.JWT_PUBLIC_KEY);
try {
  const privateKeyObject = createPrivateKey(privatePem);
  const publicKeyObject = createPublicKey(publicPem);
  if (privateKeyObject.asymmetricKeyType !== 'rsa' || publicKeyObject.asymmetricKeyType !== 'rsa') {
    throw new Error('both JWT keys must be RSA');
  }
  if ((privateKeyObject.asymmetricKeyDetails?.modulusLength || 0) < 2048) {
    throw new Error('JWT RSA private key must be at least 2048 bits');
  }
  const derivedPublic = createPublicKey(privateKeyObject).export({ type: 'spki', format: 'pem' }).toString();
  const configuredPublic = publicKeyObject.export({ type: 'spki', format: 'pem' }).toString();
  if (derivedPublic !== configuredPublic) throw new Error('JWT private/public key pair does not match');
} catch (error) {
  throw new Error(`JWT RSA key configuration is invalid: ${error.message}`);
}
if (!/^mongodb(?:\+srv)?:\/\//.test(process.env.MONGODB_URI)) {
  throw new Error('MONGODB_URI must start with mongodb:// or mongodb+srv://');
}
const sameSite = (process.env.COOKIE_SAME_SITE || 'lax').toLowerCase();
if (!['strict', 'lax', 'none'].includes(sameSite)) {
  throw new Error('COOKIE_SAME_SITE must be strict, lax, or none');
}
if (sameSite === 'none' && process.env.NODE_ENV !== 'production') {
  // Browsers require Secure for SameSite=None; local HTTP defaults to Lax.
  console.warn('COOKIE_SAME_SITE=none requires HTTPS/Secure cookies in browsers.');
}

export const env = Object.freeze({
  nodeEnv: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',
  port: Number(process.env.PORT || 4000),
  appName: process.env.APP_NAME || 'RuangAset',
  mongoUri: process.env.MONGODB_URI,
  jwtPrivateKey: privatePem,
  jwtPublicKey: publicPem,
  jwtIssuer: process.env.JWT_ISSUER || 'ruangaset-api',
  jwtAudience: process.env.JWT_AUDIENCE || 'ruangaset-web',
  jwtAccessTtl: process.env.JWT_ACCESS_TTL || '15m',
  refreshTokenDays: Number(process.env.REFRESH_TOKEN_DAYS || 30),
  corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:3000')
    .split(',').map((origin) => origin.trim()).filter(Boolean),
  cookieName: process.env.COOKIE_NAME || 'ra_refresh',
  cookieSameSite: sameSite,
  cookieDomain: process.env.COOKIE_DOMAIN || undefined,
  registerEnabled: (process.env.REGISTER_ENABLED || 'true').toLowerCase() === 'true',
});

if (!Number.isInteger(env.port) || env.port < 1 || env.port > 65535) {
  throw new Error('PORT must be a valid TCP port');
}
if (!Number.isInteger(env.refreshTokenDays) || env.refreshTokenDays < 1 || env.refreshTokenDays > 365) {
  throw new Error('REFRESH_TOKEN_DAYS must be between 1 and 365');
}

for (const origin of env.corsOrigins) {
  let parsed;
  try { parsed = new URL(origin); } catch { throw new Error(`Invalid CORS_ORIGINS entry: ${origin}`); }
  if (!['http:', 'https:'].includes(parsed.protocol) || parsed.origin !== origin || origin === '*') {
    throw new Error(`CORS_ORIGINS must contain exact origins without paths or trailing slashes: ${origin}`);
  }
}
