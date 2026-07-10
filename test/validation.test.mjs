import test from 'node:test';
import assert from 'node:assert/strict';
import { parseGeneratedKeywords, sanitizeApprovedIds, sanitizeKeywords } from '../server/validation.mjs';

test('keywords are trimmed, deduplicated case-insensitively, and bounded', () => {
  const result = sanitizeKeywords([' passport ', 'PASSPORT', 'medical   results', '', 42], 10);
  assert.deepEqual(result, ['passport', 'medical results']);
});

test('generated keyword JSON is validated', () => {
  const result = parseGeneratedKeywords('{"keywords":["salary", "Salary", "api key"]}');
  assert.deepEqual(result, ['salary', 'api key']);
});

test('only positively unpinned candidate IDs can be approved', () => {
  const candidates = [
    { id: 'safe', pinState: 'unpinned' },
    { id: 'pinned', pinState: 'pinned' },
    { id: 'unknown', pinState: 'unknown' }
  ];
  assert.deepEqual(sanitizeApprovedIds(['safe', 'pinned', 'unknown', 'missing'], candidates), ['safe']);
});

