import fs from 'node:fs/promises';
import path from 'node:path';

export async function readJson(filePath, fallback = null) {
  try {
    return JSON.parse(await fs.readFile(filePath, 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') return fallback;
    throw error;
  }
}

export async function writeJson(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

export async function removeFile(filePath) {
  await fs.rm(filePath, { force: true });
}

export function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}
