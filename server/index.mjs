import fs from 'node:fs/promises';
import path from 'node:path';
import express from 'express';
import open from 'open';
import { createServer as createViteServer } from 'vite';
import { findChromeExecutable } from './chatgpt.mjs';
import { loadConfig, ROOT } from './config.mjs';
import { createApiRouter } from './routes.mjs';
import { AppState } from './state.mjs';
import { readJson } from './storage.mjs';

const isDev = process.argv.includes('--dev');
const config = await loadConfig();
const preferences = await readJson(path.join(config.dataDir, 'preferences.json'), { keywords: [] });
const state = new AppState({ config, keywords: Array.isArray(preferences?.keywords) ? preferences.keywords : [] });
state.value.paths.browser = await findChromeExecutable(config).catch(() => null);

const app = express();
app.disable('x-powered-by');

app.use('/api', (request, response, next) => {
  const hostname = (request.headers.host || '').split(':')[0];
  if (!['127.0.0.1', 'localhost'].includes(hostname)) {
    return response.status(403).json({ error: 'ClearSlate accepts local requests only.' });
  }
  const origin = request.headers.origin;
  if (origin) {
    try {
      if (!['127.0.0.1', 'localhost'].includes(new URL(origin).hostname)) {
        return response.status(403).json({ error: 'Cross-origin requests are not allowed.' });
      }
    } catch {
      return response.status(403).json({ error: 'Invalid request origin.' });
    }
  }
  next();
});
app.use('/api', express.json({ limit: '32kb' }));
app.use('/api', createApiRouter({ state, config }));
app.use('/api', (error, _request, response, _next) => {
  console.error(error);
  response.status(400).json({ error: error.message || 'Request failed.' });
});

if (isDev) {
  const vite = await createViteServer({ root: ROOT, server: { middlewareMode: true }, appType: 'spa' });
  app.use(vite.middlewares);
} else {
  const dist = path.join(ROOT, 'dist');
  try {
    await fs.access(path.join(dist, 'index.html'));
  } catch {
    throw new Error('The app has not been built. Run npm run build first.');
  }
  app.use(express.static(dist));
  app.use((request, response, next) => {
    if (request.method !== 'GET') return next();
    response.sendFile(path.join(dist, 'index.html'));
  });
}

function listen(port) {
  return new Promise((resolve, reject) => {
    const server = app.listen(port, '127.0.0.1');
    server.once('listening', () => resolve({ server, port }));
    server.once('error', reject);
  });
}

let running;
for (let offset = 0; offset < 10; offset += 1) {
  try {
    running = await listen(config.port + offset);
    break;
  } catch (error) {
    if (error.code !== 'EADDRINUSE') throw error;
  }
}
if (!running) throw new Error(`Could not find an available local port near ${config.port}.`);

const url = `http://127.0.0.1:${running.port}`;
console.log(`\nClearSlate is running at ${url}`);
console.log('Keep this terminal open while using the app. Press Ctrl+C to stop.\n');
if (process.env.CLEARSLATE_NO_OPEN !== '1') await open(url).catch(() => {});

