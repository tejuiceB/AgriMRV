import crypto from 'crypto';
import fs from 'fs';

export function sha256OfString(s: string) {
  try {
    return crypto.createHash('sha256').update(s).digest('hex');
  } catch (error) {
    console.error('Error hashing string:', error);
    throw new Error(`Failed to hash string: ${(error as Error).message}`);
  }
}

export function sha256OfFile(path: string) {
  try {
    if (!fs.existsSync(path)) {
      throw new Error(`File not found: ${path}`);
    }
    const buf = fs.readFileSync(path);
    return crypto.createHash('sha256').update(buf).digest('hex');
  } catch (error) {
    console.error(`Error hashing file ${path}:`, error);
    throw new Error(`Failed to hash file ${path}: ${(error as Error).message}`);
  }
}
