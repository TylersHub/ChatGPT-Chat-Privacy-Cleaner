import path from 'node:path';
import { Router } from 'express';
import { deleteApprovedChats, launchLoginBrowser, scanChatHistory, verifyConnection } from './chatgpt.mjs';
import { generateKeywords } from './openai-keywords.mjs';
import { timestamp, writeJson } from './storage.mjs';
import { sanitizeApprovedIds, sanitizeKeywords } from './validation.mjs';

function asyncRoute(handler) {
  return (request, response, next) => Promise.resolve(handler(request, response)).catch(next);
}

export function createApiRouter({ state, config }) {
  const router = Router();

  router.get('/state', (_request, response) => {
    response.json(state.snapshot());
  });

  router.post('/login/open', asyncRoute(async (_request, response) => {
    if (state.value.job) throw new Error('Wait for the current task to finish.');
    const launched = await launchLoginBrowser(config);
    state.patch({
      connected: false,
      loginOpened: true,
      error: null,
      notice: 'Chrome opened with ClearSlate’s dedicated profile.'
    });
    response.json({ ok: true, browser: launched.executablePath });
  }));

  router.post('/login/verify', asyncRoute(async (_request, response) => {
    if (state.value.job) throw new Error('Wait for the current task to finish.');
    await verifyConnection(config);
    state.patch({ connected: true, loginOpened: false, error: null, notice: 'ChatGPT connection verified.' });
    response.json({ ok: true });
  }));

  router.post('/keywords', asyncRoute(async (request, response) => {
    if (state.value.job) throw new Error('Keywords cannot change while a task is running.');
    const keywords = sanitizeKeywords(request.body?.keywords, config.maxKeywords);
    if (!keywords.length) throw new Error('Add at least one keyword.');
    state.patch({ keywords, candidates: [], approvedIds: [], deletionResults: [], error: null, notice: 'Keywords saved locally.' });
    await writeJson(path.join(config.dataDir, 'preferences.json'), { keywords });
    response.json({ ok: true, keywords });
  }));

  router.post('/keywords/generate', asyncRoute(async (request, response) => {
    const keywords = await generateKeywords({
      apiKey: request.body?.apiKey,
      description: request.body?.description,
      model: config.openaiModel
    });
    response.json({ keywords });
  }));

  router.post('/scan/start', asyncRoute(async (_request, response) => {
    if (!state.value.connected) throw new Error('Verify your ChatGPT connection first.');
    if (!state.value.keywords.length) throw new Error('Save at least one keyword first.');
    const signal = state.startJob('scan');
    state.patch({ candidates: [], approvedIds: [], deletionResults: [] });
    response.status(202).json({ ok: true });

    void (async () => {
      try {
        const liveCandidates = [];
        const candidates = await scanChatHistory(config, state.value.keywords, {
          signal,
          onProgress: (progress) => state.setProgress(progress),
          onActivity: (message, tone) => state.addActivity(message, tone),
          onCandidate: (candidate) => {
            liveCandidates.push(candidate);
            state.patch({ candidates: [...liveCandidates] });
          }
        });
        const report = {
          generatedAt: new Date().toISOString(),
          mode: 'scan-only',
          safety: { deletionPerformed: false, fullConversationTextStored: false },
          keywords: state.value.keywords,
          candidates
        };
        await writeJson(path.join(config.outputDir, 'candidates-latest.json'), report);
        await writeJson(path.join(config.outputDir, `candidates-${timestamp()}.json`), report);
        state.patch({ candidates });
        state.finishJob(`Scan complete. ${candidates.length} matching chat${candidates.length === 1 ? '' : 's'} ready to review.`);
      } catch (error) {
        if (error.name === 'AbortError') {
          state.setProgress({ stage: 'cancelled', label: 'Scan cancelled' });
          state.finishJob('Scan cancelled. Nothing was deleted.');
        } else state.failJob(error);
      }
    })();
  }));

  router.post('/job/cancel', (_request, response) => {
    response.json({ ok: state.cancelJob() });
  });

  router.post('/review', asyncRoute(async (request, response) => {
    if (state.value.job) throw new Error('Wait for the current task to finish.');
    const approvedIds = sanitizeApprovedIds(request.body?.approvedIds, state.value.candidates);
    state.patch({ approvedIds, error: null, notice: `${approvedIds.length} chat${approvedIds.length === 1 ? '' : 's'} selected.` });
    await writeJson(path.join(config.outputDir, 'approved-latest.json'), {
      generatedAt: new Date().toISOString(),
      approved: state.value.candidates.filter((candidate) => approvedIds.includes(candidate.id))
    });
    response.json({ ok: true, approvedIds });
  }));

  router.post('/delete/start', asyncRoute(async (request, response) => {
    if (!state.value.connected) throw new Error('Verify your ChatGPT connection first.');
    const selected = state.value.candidates.filter((candidate) => state.value.approvedIds.includes(candidate.id));
    if (!selected.length) throw new Error('Select at least one unpinned chat in Review.');
    if (request.body?.confirmation !== `DELETE ${selected.length}`) {
      throw new Error(`Type DELETE ${selected.length} exactly to continue.`);
    }
    const signal = state.startJob('delete');
    state.patch({ deletionResults: [] });
    response.status(202).json({ ok: true });

    void (async () => {
      try {
        const results = await deleteApprovedChats(config, selected, {
          signal,
          onProgress: (progress) => state.setProgress(progress),
          onActivity: (message, tone) => state.addActivity(message, tone)
        });
        const report = {
          generatedAt: new Date().toISOString(),
          results,
          summary: {
            deleted: results.filter((item) => item.status === 'deleted').length,
            skipped: results.filter((item) => item.status === 'skipped').length,
            errors: results.filter((item) => item.status === 'error').length
          }
        };
        await writeJson(path.join(config.outputDir, `deletion-results-${timestamp()}.json`), report);
        state.patch({ deletionResults: results });
        state.finishJob(`Deletion run complete. ${report.summary.deleted} deleted, ${report.summary.skipped} protected, ${report.summary.errors} errors.`);
      } catch (error) {
        if (error.name === 'AbortError') {
          state.setProgress({ stage: 'cancelled', label: 'Deletion stopped' });
          state.finishJob('Deletion stopped. Completed actions are recorded in the activity list.');
        } else state.failJob(error);
      }
    })();
  }));

  router.post('/session/reset', (_request, response) => {
    if (state.value.job) return response.status(409).json({ error: 'Wait for the current task to finish.' });
    state.patch({
      candidates: [],
      approvedIds: [],
      deletionResults: [],
      error: null,
      notice: 'Current review cleared. Your keywords and login remain.'
    });
    state.setProgress({ stage: 'idle', current: 0, total: 0, percent: 0, label: '', activity: [] });
    response.json({ ok: true });
  });

  return router;
}
