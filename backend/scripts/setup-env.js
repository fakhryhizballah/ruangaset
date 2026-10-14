import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { generateKeyPairSync } from 'node:crypto';

const envPath = new URL('../.env', import.meta.url);
const templatePath = new URL('../.env.example', import.meta.url);
if (existsSync(envPath)) {
  console.error('backend/.env sudah ada; tidak ditimpa untuk melindungi konfigurasi Anda.');
  process.exit(1);
}
const { privateKey, publicKey } = generateKeyPairSync('rsa', {
  modulusLength: 3072,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
});
let contents = readFileSync(templatePath, 'utf8');
contents = contents.replace('JWT_PRIVATE_KEY=""', `JWT_PRIVATE_KEY="${privateKey.trim().replace(/\n/g, '\\n')}"`);
contents = contents.replace('JWT_PUBLIC_KEY=""', `JWT_PUBLIC_KEY="${publicKey.trim().replace(/\n/g, '\\n')}"`);
writeFileSync(envPath, contents, { mode: 0o600 });
console.log('backend/.env dibuat dengan pasangan kunci RSA baru.');
console.log('Edit backend/.env: isi MONGODB_URI dan SEED_ADMIN_PASSWORD sebelum menjalankan aplikasi.');
