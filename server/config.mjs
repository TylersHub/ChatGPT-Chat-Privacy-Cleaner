import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const DEFAULTS = {
  baseUrl: 'https://chatgpt.com/',
  browserExecutablePath: null,
  port: 4317,
  maxKeywords: 50,
  maxBodyCharacters: 120000,
  searchPauseMs: 900,
  navigationPauseMs: 900,
  openaiModel: 'gpt-5.4-mini'
};

async function readJson(filePath, fallback) {
  try {
    return JSON.parse(await fs.readFile(filePath, 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') return fallback;
    throw error;
  }
}

export async function loadConfig() {
  const user = await readJson(path.join(ROOT, 'config.json'), {});
  const config = { ...DEFAULTS, ...user };
  config.profileDir = path.join(ROOT, 'automation-profile');
  config.outputDir = path.join(ROOT, 'output');
  config.dataDir = path.join(ROOT, 'data');
  if (config.browserExecutablePath) {
    config.browserExecutablePath = path.resolve(ROOT, config.browserExecutablePath);
  }
  return config;
}

