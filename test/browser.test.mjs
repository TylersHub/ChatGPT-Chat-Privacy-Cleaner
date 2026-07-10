import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { conversationIdFromUrl, findChromeExecutable, loginBrowserArguments } from '../server/chatgpt.mjs';

test('conversation IDs are accepted only from exact ChatGPT conversation paths', () => {
  assert.equal(conversationIdFromUrl('https://chatgpt.com/c/abc-123'), 'abc-123');
  assert.equal(conversationIdFromUrl('https://chatgpt.com/share/abc-123'), null);
  assert.equal(conversationIdFromUrl('not a URL'), null);
});

test('normal login browser arguments isolate the profile without automation switches', () => {
  const config = { profileDir: path.resolve('automation-profile'), baseUrl: 'https://chatgpt.com/' };
  const args = loginBrowserArguments(config);
  assert.ok(args.includes(`--user-data-dir=${config.profileDir}`));
  assert.equal(args.at(-1), config.baseUrl);
  assert.equal(args.some((arg) => /^--(?:enable-automation|remote-debugging)/i.test(arg)), false);
});

test('an explicit browser executable path is honored', async () => {
  assert.equal(await findChromeExecutable({ browserExecutablePath: process.execPath }), process.execPath);
});

