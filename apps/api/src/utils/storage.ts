import fs from 'fs';
import path from 'path';

const BASE = path.resolve(process.cwd(), 'storage');

export function ensureStorage() {
  if (!fs.existsSync(BASE)) fs.mkdirSync(BASE, { recursive: true });
}

export function writeFileRel(relPath: string, data: string | Buffer) {
  ensureStorage();
  const full = path.join(BASE, relPath);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, data);
  return `file://${full}`; // artifactsUri can store this; swap with s3:// later
}
