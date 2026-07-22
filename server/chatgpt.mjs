import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';

const CHAT_PATH_RE = /^\/c\/([a-zA-Z0-9-]+)\/?$/;

export function conversationIdFromUrl(urlValue) {
  try {
    return new URL(urlValue).pathname.match(CHAT_PATH_RE)?.[1] ?? null;
  } catch {
    return null;
  }
}

export function canonicalConversationUrl(urlValue) {
  const id = conversationIdFromUrl(urlValue);
  if (!id) throw new Error(`Invalid ChatGPT conversation URL: ${urlValue}`);
  const url = new URL(urlValue);
  url.pathname = `/c/${id}`;
  url.search = '';
  url.hash = '';
  return url.toString();
}

export function searchResultTitleFromText(value) {
  return String(value).split(/\r?\n/).map((line) => line.trim()).find(Boolean) ?? '';
}

export function automatedBrowserLaunchOptions(executablePath) {
  return {
    executablePath,
    headless: false,
    viewport: null,
    chromiumSandbox: true,
    args: ['--start-maximized']
  };
}

export function isBrowserClosedError(error) {
  return /target page, context or browser has been closed|browser has been closed|page has been closed|connection closed/i
    .test(error?.message ?? '');
}

function chromeCandidates() {
  if (process.platform === 'win32') {
    return [
      process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, 'Google', 'Chrome', 'Application', 'chrome.exe'),
      process.env.PROGRAMFILES && path.join(process.env.PROGRAMFILES, 'Google', 'Chrome', 'Application', 'chrome.exe'),
      process.env['PROGRAMFILES(X86)'] && path.join(process.env['PROGRAMFILES(X86)'], 'Google', 'Chrome', 'Application', 'chrome.exe')
    ].filter(Boolean);
  }
  if (process.platform === 'darwin') {
    return [
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      process.env.HOME && path.join(process.env.HOME, 'Applications', 'Google Chrome.app', 'Contents', 'MacOS', 'Google Chrome')
    ].filter(Boolean);
  }
  return [
    '/usr/bin/google-chrome-stable',
    '/usr/bin/google-chrome',
    '/opt/google/chrome/google-chrome'
  ];
}

export async function findChromeExecutable(config) {
  const candidates = config.browserExecutablePath ? [config.browserExecutablePath] : chromeCandidates();
  for (const candidate of candidates) {
    try {
      await fs.access(candidate);
      return candidate;
    } catch {
      // Keep checking normal installation locations.
    }
  }
  throw new Error('Google Chrome was not found. Install Chrome or set browserExecutablePath in config.json.');
}

export function loginBrowserArguments(config) {
  return [
    `--user-data-dir=${config.profileDir}`,
    '--no-first-run',
    '--start-maximized',
    config.baseUrl
  ];
}

export async function launchLoginBrowser(config) {
  const executablePath = await findChromeExecutable(config);
  await fs.mkdir(config.profileDir, { recursive: true });
  const child = spawn(executablePath, loginBrowserArguments(config), {
    detached: false,
    stdio: 'ignore',
    windowsHide: false
  });
  await new Promise((resolve, reject) => {
    child.once('spawn', resolve);
    child.once('error', reject);
  });
  return { executablePath, pid: child.pid };
}

function throwIfAborted(signal) {
  if (signal?.aborted) {
    const error = new Error('Task cancelled.');
    error.name = 'AbortError';
    throw error;
  }
}

async function isSignedOut(page) {
  if (page.url().includes('/auth/')) return true;
  const controls = [
    page.getByRole('button', { name: /^log in$/i }),
    page.getByRole('link', { name: /^log in$/i })
  ];
  for (const control of controls) {
    if (await control.first().isVisible().catch(() => false)) return true;
  }
  return false;
}

async function launchAutomatedBrowser(config) {
  const executablePath = await findChromeExecutable(config);
  let context;
  try {
    context = await chromium.launchPersistentContext(
      config.profileDir,
      automatedBrowserLaunchOptions(executablePath)
    );
  } catch (error) {
    throw new Error(`Could not open the dedicated Chrome profile. Close the ClearSlate login window and try again. ${error.message}`);
  }

  const page = context.pages()[0] ?? await context.newPage();
  page.setDefaultTimeout(10_000);
  page.setDefaultNavigationTimeout(30_000);
  try {
    await page.goto(config.baseUrl, { waitUntil: 'domcontentloaded' });
    if (await isSignedOut(page)) {
      throw new Error('ChatGPT is signed out. Return to Connect and complete login in the normal Chrome window.');
    }
    return { context, page };
  } catch (error) {
    await context.close();
    throw error;
  }
}

export async function verifyConnection(config) {
  const { context } = await launchAutomatedBrowser(config);
  await context.close();
  return true;
}

async function visibleLocator(locator) {
  const count = await locator.count();
  for (let index = 0; index < count; index += 1) {
    const candidate = locator.nth(index);
    if (await candidate.isVisible().catch(() => false)) return candidate;
  }
  return null;
}

async function getSearchInput(page) {
  const dialog = await visibleLocator(page.locator('[role="dialog"]'));
  const scopes = dialog ? [dialog, page] : [page];
  for (const scope of scopes) {
    const candidates = [
      scope.getByPlaceholder(/search chats|search/i),
      scope.getByRole('textbox', { name: /search/i }),
      scope.locator('input[type="search"]'),
      scope.locator('input[placeholder*="Search" i]')
    ];
    for (const candidate of candidates) {
      const visible = await visibleLocator(candidate);
      if (visible) return visible;
    }
  }
  return null;
}

async function openChatSearch(page) {
  let input = await getSearchInput(page);
  if (input) return input;

  await page.keyboard.press(process.platform === 'darwin' ? 'Meta+K' : 'Control+K').catch(() => {});
  for (let attempt = 0; attempt < 8; attempt += 1) {
    await page.waitForTimeout(125);
    input = await getSearchInput(page);
    if (input) return input;
  }

  const searchButtons = [
    page.getByRole('button', { name: /search chats/i }),
    page.getByRole('button', { name: /^search$/i }),
    page.locator('nav').getByText(/search chats/i)
  ];
  for (const locator of searchButtons) {
    const button = await visibleLocator(locator);
    if (!button) continue;
    await button.click({ force: true });
    for (let attempt = 0; attempt < 16; attempt += 1) {
      await page.waitForTimeout(125);
      input = await getSearchInput(page);
      if (input) return input;
    }
  }
  throw new Error('Could not open ChatGPT chat-history search. The ChatGPT interface may have changed.');
}

async function searchScope(page) {
  return await visibleLocator(page.locator('[role="dialog"]')) ?? page;
}

async function searchConversationLinks(page, query, pauseMs) {
  const input = await openChatSearch(page);
  await input.fill(query);
  await page.waitForTimeout(pauseMs);
  const scope = await searchScope(page);
  for (let attempt = 0; attempt < 8 && await scope.locator('a[href*="/c/"]').count() === 0; attempt += 1) {
    await page.waitForTimeout(250);
  }
  const found = new Map();
  let unchangedRounds = 0;
  let previousCount = 0;

  for (let round = 0; round < 12; round += 1) {
    const anchors = scope.locator('a[href*="/c/"]');
    for (let index = 0; index < await anchors.count(); index += 1) {
      const anchor = anchors.nth(index);
      if (!await anchor.isVisible().catch(() => false)) continue;
      const href = await anchor.getAttribute('href');
      if (!href) continue;
      const url = new URL(href, page.url()).toString();
      const id = conversationIdFromUrl(url);
      if (!id) continue;
      const title = searchResultTitleFromText(await anchor.innerText().catch(() => ''));
      found.set(id, { id, url, title });
    }
    unchangedRounds = found.size === previousCount ? unchangedRounds + 1 : 0;
    previousCount = found.size;
    if (unchangedRounds >= 2) break;
    await scope.hover().catch(() => {});
    await page.mouse.wheel(0, 1100);
    await page.waitForTimeout(250);
  }
  await page.keyboard.press('Escape').catch(() => {});
  await page.waitForTimeout(180);
  return [...found.values()];
}

async function openConversation(page, url, pauseMs) {
  const canonicalUrl = canonicalConversationUrl(url);
  await page.goto(canonicalUrl, { waitUntil: 'commit' });
  await waitForConversationContent(page, pauseMs);
  const expectedId = conversationIdFromUrl(url);
  if (!expectedId || conversationIdFromUrl(page.url()) !== expectedId) {
    throw new Error('Navigation did not remain on the expected conversation.');
  }
}

async function waitForConversationContent(page, minimumDelayMs) {
  const turns = page.locator('main [data-message-author-role], main [data-message-id]');
  try {
    await turns.first().waitFor({ state: 'attached', timeout: 30_000 });
  } catch {
    throw new Error('Conversation messages did not load within 30 seconds.');
  }

  await page.waitForTimeout(Math.max(500, minimumDelayMs));
  let previousLength = -1;
  let stableRounds = 0;
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const textLength = await turns.evaluateAll((elements) => elements.reduce(
      (total, element) => total + (element.innerText || '').trim().length,
      0
    ));
    if (textLength > 0 && textLength === previousLength) stableRounds += 1;
    else stableRounds = 0;
    if (stableRounds >= 2) return;
    previousLength = textLength;
    await page.waitForTimeout(400);
  }
  throw new Error('Conversation messages did not finish loading.');
}

async function getConversationSnapshot(page, maxBodyCharacters, fallbackTitle = '') {
  const id = conversationIdFromUrl(page.url());
  if (!id) throw new Error('Current page is not a ChatGPT conversation URL.');
  const exactAnchors = page.locator(`a[href="/c/${id}"], a[href$="/c/${id}"]`);
  let title = '';
  for (let index = 0; index < await exactAnchors.count(); index += 1) {
    const text = (await exactAnchors.nth(index).innerText().catch(() => '')).trim().replace(/\s+/g, ' ');
    if (text && text.length > title.length) title = text;
  }
  if (!title) title = (await page.title()).replace(/\s*[|–-]\s*ChatGPT.*$/i, '').trim();
  if (!title || /^chatgpt$/i.test(title)) title = fallbackTitle.trim();
  const main = page.locator('main').first();
  const turns = main.locator('[data-message-author-role], [data-message-id]');
  const turnTexts = await turns.allInnerTexts().catch(() => []);
  const body = (turnTexts.length ? turnTexts.join('\n\n') : await main.innerText().catch(() => page.locator('body').innerText()))
    .slice(0, maxBodyCharacters);
  return { id, title: title || `Conversation ${id}`, body };
}

async function findChatRow(page, conversationId) {
  for (const selector of [
    `a[href="/c/${conversationId}"]`,
    `a[href$="/c/${conversationId}"]`,
    `a[href^="/c/${conversationId}?"]`,
    `a[href*="/c/${conversationId}?"]`
  ]) {
    const anchors = page.locator(selector);
    for (let index = 0; index < await anchors.count(); index += 1) {
      const anchor = anchors.nth(index);
      if (!await anchor.isVisible().catch(() => false)) continue;
      const row = anchor.locator('xpath=ancestor::*[self::li or self::div][.//button][1]');
      if (await row.count()) return { anchor, row: row.first() };
    }
  }
  return null;
}

async function openConversationMenu(page, conversationId, title = '') {
  let located = await findChatRow(page, conversationId);
  if (!located && title) {
    const input = await openChatSearch(page);
    await input.fill(title);
    await page.waitForTimeout(800);
    located = await findChatRow(page, conversationId);
  }
  if (!located) throw new Error('Could not locate this conversation row to inspect its menu.');

  await located.row.hover();
  const exactButton = page.locator(`button[data-conversation-options-trigger="${conversationId}"]`);
  const buttonGroups = [
    exactButton,
    located.row.getByRole('button', { name: /conversation options|chat options|more options|more/i }),
    located.row.locator('button[aria-haspopup="menu"]'),
    located.row.locator('button')
  ];
  let menuButton = null;
  for (const buttons of buttonGroups) {
    for (let index = await buttons.count() - 1; index >= 0; index -= 1) {
      if (await buttons.nth(index).isVisible().catch(() => false)) {
        menuButton = buttons.nth(index);
        break;
      }
    }
    if (menuButton) break;
  }
  if (!menuButton) throw new Error('Could not find the conversation options button.');
  await menuButton.click({ force: true });
  const menuLocator = page.locator('[role="menu"]');
  await menuLocator.first().waitFor({ state: 'visible', timeout: 5_000 }).catch(() => {});
  const menu = await visibleLocator(menuLocator);
  if (!menu) throw new Error('Conversation options did not open as a menu.');
  return menu;
}

async function ensureSidebarOpen(page) {
  const closeButton = page.getByTestId('close-sidebar-button');
  if (await closeButton.first().isVisible().catch(() => false)) return;
  const openButton = page.getByRole('button', { name: /^open sidebar$/i });
  const visibleOpen = await visibleLocator(openButton);
  if (!visibleOpen) return;
  await visibleOpen.click({ force: true });
  await closeButton.first().waitFor({ state: 'visible', timeout: 5_000 }).catch(() => {});
}

async function detectPinStateFromSidebar(page, conversationId) {
  try {
    await ensureSidebarOpen(page);
    const pinnedHeading = page.getByRole('button', { name: /^pinned$/i });
    if (
      await pinnedHeading.first().isVisible().catch(() => false) &&
      await page.locator('button[aria-label^="Unpin "]').count() === 0
    ) {
      await pinnedHeading.first().click({ force: true }).catch(() => {});
      await page.waitForTimeout(250);
    }

    const result = await page.evaluate((targetId) => {
      const buttons = [...document.querySelectorAll('button')];
      const hasRecentsHeading = buttons.some((button) => (button.innerText || '').trim() === 'Recents');
      const hasPinnedHeading = buttons.some((button) => (button.innerText || '').trim() === 'Pinned');
      const unpinButtons = [...document.querySelectorAll('button[aria-label^="Unpin "]')];
      const pinnedIds = [];

      for (const button of unpinButtons) {
        let current = button.parentElement;
        for (let depth = 0; current && depth < 8; depth += 1, current = current.parentElement) {
          const anchor = current.querySelector('a[href*="/c/"]');
          if (!anchor) continue;
          const match = new URL(anchor.href, location.origin).pathname.match(/^\/c\/([a-zA-Z0-9-]+)\/?$/);
          if (match) pinnedIds.push(match[1]);
          break;
        }
      }

      const complete = hasRecentsHeading &&
        pinnedIds.length === unpinButtons.length &&
        (!hasPinnedHeading || unpinButtons.length > 0);
      return { complete, pinned: pinnedIds.includes(targetId) };
    }, conversationId);

    if (!result.complete) return { state: 'unknown', source: 'sidebar-pinned-list-incomplete' };
    return { state: result.pinned ? 'pinned' : 'unpinned', source: 'sidebar-pinned-list' };
  } catch (error) {
    return { state: 'unknown', source: 'sidebar-pinned-list-error', error: error.message };
  }
}

async function detectPinState(page, conversationId, title) {
  const sidebarState = await detectPinStateFromSidebar(page, conversationId);
  if (sidebarState.state !== 'unknown') return sidebarState;

  try {
    const menu = await openConversationMenu(page, conversationId, title);
    const text = (await menu.innerText()).toLocaleLowerCase();
    const state = /\bunpin\b/.test(text) ? 'pinned' : /\bpin\b/.test(text) ? 'unpinned' : 'unknown';
    await page.keyboard.press('Escape').catch(() => {});
    await page.keyboard.press('Escape').catch(() => {});
    return { state, source: 'conversation-menu' };
  } catch (error) {
    await page.keyboard.press('Escape').catch(() => {});
    await page.keyboard.press('Escape').catch(() => {});
    return { state: 'unknown', source: 'ui-error', error: error.message };
  }
}

async function deleteConversation(page, candidate) {
  if (conversationIdFromUrl(page.url()) !== candidate.id) {
    throw new Error('The open URL does not match the approved conversation ID.');
  }
  const menu = await openConversationMenu(page, candidate.id, candidate.title);
  const deleteOptions = [
    menu.getByRole('menuitem', { name: /^delete(?: chat| conversation)?$/i }),
    menu.getByText(/^delete(?: chat| conversation)?$/i)
  ];
  let deleteItem = null;
  for (const option of deleteOptions) {
    deleteItem = await visibleLocator(option);
    if (deleteItem) break;
  }
  if (!deleteItem) throw new Error('Delete menu item was not found.');
  await deleteItem.click();

  const dialogLocator = page.locator('[role="dialog"]');
  await dialogLocator.first().waitFor({ state: 'visible', timeout: 5_000 }).catch(() => {});
  const dialog = await visibleLocator(dialogLocator);
  if (!dialog || !(await dialog.innerText()).toLocaleLowerCase().includes('delete')) {
    throw new Error('Expected delete confirmation dialog did not appear.');
  }
  const confirmOptions = [
    dialog.getByRole('button', { name: /^delete$/i }),
    dialog.getByRole('button', { name: /delete chat|delete conversation/i })
  ];
  let confirm = null;
  for (const option of confirmOptions) {
    confirm = await visibleLocator(option);
    if (confirm) break;
  }
  if (!confirm) throw new Error('Delete confirmation button was not found.');
  await confirm.click();
  await page.waitForFunction(
    (expectedId) => !location.pathname.startsWith(`/c/${expectedId}`),
    candidate.id,
    { timeout: 10_000 }
  ).catch(() => {});
  return conversationIdFromUrl(page.url()) !== candidate.id;
}

export async function scanChatHistory(config, keywords, { onProgress, onActivity, onCandidate, signal } = {}) {
  let session = await launchAutomatedBrowser(config);
  const discovered = new Map();

  async function restartBrowser() {
    await session?.context.close().catch(() => {});
    session = await launchAutomatedBrowser(config);
    return session.page;
  }

  async function withBrowserRecovery(operation) {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const page = session.page.isClosed() ? await restartBrowser() : session.page;
      try {
        return await operation(page);
      } catch (error) {
        if (attempt > 0 || !isBrowserClosedError(error)) throw error;
        onActivity?.('Chrome closed unexpectedly. Reopening it and retrying the current step.', 'warning');
        await restartBrowser();
      }
    }
    throw new Error('Browser recovery failed.');
  }

  try {
    for (let index = 0; index < keywords.length; index += 1) {
      throwIfAborted(signal);
      const query = keywords[index];
      onProgress?.({
        stage: 'searching',
        current: index,
        total: keywords.length,
        percent: Math.round((index / keywords.length) * 55),
        label: `Searching for “${query}”`
      });
      try {
        const results = await withBrowserRecovery((page) => searchConversationLinks(page, query, config.searchPauseMs));
        for (const result of results) {
          const current = discovered.get(result.id) ?? { ...result, searchHits: [] };
          current.searchHits = [...new Set([...current.searchHits, query])];
          if (!current.title && result.title) current.title = result.title;
          discovered.set(result.id, current);
        }
        onActivity?.(`${query} — ${results.length} chat${results.length === 1 ? '' : 's'} found`, 'success');
      } catch (error) {
        onActivity?.(`${query} — skipped: ${error.message}`, 'warning');
      }
    }

    const items = [...discovered.values()];
    const candidates = [];
    for (let index = 0; index < items.length; index += 1) {
      throwIfAborted(signal);
      const item = items[index];
      onProgress?.({
        stage: 'inspecting',
        current: index,
        total: items.length,
        percent: 55 + Math.round((index / Math.max(1, items.length)) * 44),
        label: `Checking ${item.title || 'matching chat'}`
      });
      try {
        const snapshot = await withBrowserRecovery(async (page) => {
          await openConversation(page, item.url, config.navigationPauseMs);
          return getConversationSnapshot(page, config.maxBodyCharacters, item.title);
        });
        const haystack = `${snapshot.title}\n${snapshot.body}`.toLocaleLowerCase();
        const textMatches = keywords.filter((keyword) => haystack.includes(keyword.toLocaleLowerCase()));
        const pin = await withBrowserRecovery(async (page) => {
          if (conversationIdFromUrl(page.url()) !== snapshot.id) {
            await openConversation(page, item.url, config.navigationPauseMs);
          }
          const detected = await detectPinState(page, snapshot.id, snapshot.title);
          if (detected.state === 'unknown' && isBrowserClosedError(new Error(detected.error ?? ''))) {
            throw new Error(detected.error);
          }
          return detected;
        });
        const candidate = {
          id: snapshot.id,
          title: snapshot.title,
          url: item.url,
          pinState: pin.state,
          pinStateSource: pin.source,
          pinStateError: pin.error ?? null,
          matchedKeywords: [...new Set([...item.searchHits, ...textMatches])]
        };
        candidates.push(candidate);
        onCandidate?.(candidate);
      } catch (error) {
        onActivity?.(`${item.title || item.id} — ${error.message}`, 'warning');
      }
    }

    const pinOrder = { unpinned: 0, unknown: 1, pinned: 2 };
    candidates.sort((a, b) => (pinOrder[a.pinState] - pinOrder[b.pinState]) || a.title.localeCompare(b.title));
    onProgress?.({ stage: 'complete', current: candidates.length, total: candidates.length, percent: 100, label: 'Scan complete' });
    return candidates;
  } finally {
    await session?.context.close().catch(() => {});
  }
}

export async function deleteApprovedChats(config, candidates, { onProgress, onActivity, signal } = {}) {
  const { context, page } = await launchAutomatedBrowser(config);
  const results = [];
  try {
    for (let index = 0; index < candidates.length; index += 1) {
      throwIfAborted(signal);
      const candidate = candidates[index];
      onProgress?.({
        stage: 'deleting',
        current: index,
        total: candidates.length,
        percent: Math.round((index / candidates.length) * 100),
        label: `Checking ${candidate.title}`
      });
      try {
        await openConversation(page, candidate.url, config.navigationPauseMs);
        const snapshot = await getConversationSnapshot(page, config.maxBodyCharacters, candidate.title);
        if (snapshot.id !== candidate.id) throw new Error('Conversation ID changed.');
        const pin = await detectPinState(page, candidate.id, snapshot.title);
        if (pin.state !== 'unpinned') {
          const reason = `Protected because pin state is ${pin.state}`;
          results.push({ id: candidate.id, title: candidate.title, status: 'skipped', reason });
          onActivity?.(`${candidate.title} — skipped`, 'warning');
          continue;
        }
        if (!await deleteConversation(page, candidate)) throw new Error('Could not verify that the chat closed after deletion.');
        results.push({ id: candidate.id, title: candidate.title, status: 'deleted' });
        onActivity?.(`${candidate.title} — deleted`, 'success');
      } catch (error) {
        results.push({ id: candidate.id, title: candidate.title, status: 'error', reason: error.message });
        onActivity?.(`${candidate.title} — ${error.message}`, 'warning');
      }
      onProgress?.({
        stage: 'deleting',
        current: index + 1,
        total: candidates.length,
        percent: Math.round(((index + 1) / candidates.length) * 100),
        label: `${index + 1} of ${candidates.length} processed`
      });
    }
    return results;
  } finally {
    await context.close();
  }
}
