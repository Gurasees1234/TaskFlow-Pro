import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

const UPLOAD_ROOT = path.resolve(process.cwd(), 'uploads');

export const ensureUploadRoot = async () => {
  await fs.mkdir(UPLOAD_ROOT, { recursive: true });
  return UPLOAD_ROOT;
};

export const saveLocalFile = async ({ buffer, originalName }) => {
  await ensureUploadRoot();
  const ext = path.extname(originalName || '').replace(/[^a-zA-Z0-9.]/g, '').slice(0, 12);
  const storageKey = `${crypto.randomUUID()}${ext}`;
  const fullPath = path.join(UPLOAD_ROOT, storageKey);
  await fs.writeFile(fullPath, buffer);
  return { storageKey, fullPath };
};

export const resolveSafeLocalPath = (storageKey) => {
  const safeName = path.basename(storageKey || '');
  const fullPath = path.join(UPLOAD_ROOT, safeName);
  if (!fullPath.startsWith(UPLOAD_ROOT)) {
    throw new Error('Invalid storage path');
  }
  return fullPath;
};

export const deleteLocalFile = async (storageKey) => {
  if (!storageKey) return;
  try {
    const fullPath = resolveSafeLocalPath(storageKey);
    await fs.unlink(fullPath);
  } catch {
    // ignore missing file on cleanup
  }
};
