import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {
  automatedBrowserLaunchOptions,
  canonicalConversationUrl,
  conversationIdFromUrl,
  findChromeExecutable,
  isBrowserClosedError,
  loginBrowserArguments,
  searchResultTitleFromText
} from '../server/chatgpt.mjs';

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

test('conversation search parameters are removed before navigation', () => {
  assert.equal(
    canonicalConversationUrl('https://chatgpt.com/c/abc-123?src=history_search&messageId=message'),
    'https://chatgpt.com/c/abc-123'
  );
});

test('search result titles exclude snippets and dates', () => {
  assert.equal(searchResultTitleFromText('Private chat title\nMatching message snippet\nYesterday'), 'Private chat title');
});

test('automated Chrome launches with its sandbox enabled', () => {
  const options = automatedBrowserLaunchOptions(process.execPath);
  assert.equal(options.chromiumSandbox, true);
  assert.equal(options.args.includes('--no-sandbox'), false);
});

test('closed browser errors are recognized for one-time scan recovery', () => {
  assert.equal(isBrowserClosedError(new Error('page.goto: Target page, context or browser has been closed')), true);
  assert.equal(isBrowserClosedError(new Error('Conversation messages did not load')), false);
});
