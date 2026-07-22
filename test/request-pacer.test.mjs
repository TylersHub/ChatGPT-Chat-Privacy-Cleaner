import assert from 'node:assert/strict';
import test from 'node:test';
import { RequestPacer, pageIsRateLimited, waitWithSignal } from '../server/request-pacer.mjs';

function fakePage({ limited = false } = {}) {
  return {
    isClosed: () => false,
    getByText: () => ({ first: () => ({ isVisible: async () => limited }) }),
    getByRole: () => ({ first: () => ({ isVisible: async () => false }) })
  };
}

test('the ChatGPT request warning is detected from visible page text', async () => {
  assert.equal(await pageIsRateLimited(fakePage({ limited: true })), true);
  assert.equal(await pageIsRateLimited(fakePage()), false);
});

test('a cooldown wait remains cancellable', async () => {
  const controller = new AbortController();
  const waiting = waitWithSignal(60_000, controller.signal);
  controller.abort();
  await assert.rejects(waiting, { name: 'AbortError' });
});

test('scheduled batch cooldown runs once for a completed batch', async () => {
  const activities = [];
  const pacer = new RequestPacer({
    requestDelayMinMs: 0,
    requestDelayMaxMs: 0,
    requestBatchSize: 1,
    batchCooldownMinMs: 1,
    batchCooldownMaxMs: 1,
    rateLimitBackoffMs: []
  }, { onActivity: (message) => activities.push(message) });
  const page = fakePage();
  await pacer.run(() => page, async () => 'first');
  await pacer.beforeAction();
  await pacer.beforeAction();
  assert.equal(activities.length, 1);
});

test('a visible request warning pauses before the browser operation and saves a checkpoint', async () => {
  let limited = true;
  let operations = 0;
  let checkpoints = 0;
  const page = {
    ...fakePage(),
    getByText: () => ({ first: () => ({ isVisible: async () => limited }) }),
    getByRole: () => ({ first: () => ({
      isVisible: async () => true,
      click: async () => { limited = false; }
    }) })
  };
  const pacer = new RequestPacer({
    requestDelayMinMs: 0,
    requestDelayMaxMs: 0,
    requestBatchSize: 10,
    batchCooldownMinMs: 0,
    batchCooldownMaxMs: 0,
    rateLimitBackoffMs: [1]
  }, { onCheckpoint: () => { checkpoints += 1; } });

  await pacer.run(() => page, async () => { operations += 1; });

  assert.equal(checkpoints, 1);
  assert.equal(operations, 1);
});
