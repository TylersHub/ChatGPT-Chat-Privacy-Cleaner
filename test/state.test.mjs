import test from 'node:test';
import assert from 'node:assert/strict';
import { AppState } from '../server/state.mjs';

const config = { profileDir: 'profile', outputDir: 'output', dataDir: 'data' };

test('progress is clamped to a stable 0-100 range', () => {
  const state = new AppState({ config });
  state.setProgress({ current: 12, total: 10, percent: 140 });
  assert.equal(state.value.progress.current, 10);
  assert.equal(state.value.progress.percent, 100);
});

test('only one destructive or scanning job can run at a time', () => {
  const state = new AppState({ config });
  state.startJob('scan');
  assert.throws(() => state.startJob('delete'), /already running/i);
});

