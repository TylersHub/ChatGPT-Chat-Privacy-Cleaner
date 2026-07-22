function abortError() {
  const error = new Error('Task cancelled.');
  error.name = 'AbortError';
  return error;
}

function randomBetween(minimum, maximum) {
  const min = Math.max(0, Number(minimum) || 0);
  const max = Math.max(min, Number(maximum) || min);
  return Math.round(min + Math.random() * (max - min));
}

export function waitWithSignal(milliseconds, signal) {
  if (signal?.aborted) return Promise.reject(abortError());
  return new Promise((resolve, reject) => {
    const timer = setTimeout(done, Math.max(0, milliseconds));
    function done() {
      signal?.removeEventListener('abort', cancelled);
      resolve();
    }
    function cancelled() {
      clearTimeout(timer);
      signal?.removeEventListener('abort', cancelled);
      reject(abortError());
    }
    signal?.addEventListener('abort', cancelled, { once: true });
  });
}

export async function pageIsRateLimited(page) {
  if (!page || page.isClosed()) return false;
  const warning = page.getByText(/too many requests|making requests too quickly|temporarily limited access/i);
  return warning.first().isVisible().catch(() => false);
}

async function dismissRateLimitNotice(page) {
  if (!page || page.isClosed()) return;
  const button = page.getByRole('button', { name: /got it/i }).first();
  if (await button.isVisible().catch(() => false)) await button.click().catch(() => {});
}

function durationLabel(milliseconds) {
  if (milliseconds < 60_000) {
    const seconds = Math.max(1, Math.ceil(milliseconds / 1000));
    return `${seconds} second${seconds === 1 ? '' : 's'}`;
  }
  const minutes = Math.max(1, Math.ceil(milliseconds / 60_000));
  return `${minutes} minute${minutes === 1 ? '' : 's'}`;
}

function rateLimitError() {
  return new Error('ChatGPT rate limit detected.');
}

export class RequestPacer {
  constructor(config, { signal, onProgress, onActivity, onCheckpoint } = {}) {
    this.config = config;
    this.signal = signal;
    this.onProgress = onProgress;
    this.onActivity = onActivity;
    this.onCheckpoint = onCheckpoint;
    this.completedActions = 0;
    this.lastBatchCooldownAt = null;
  }

  async pause(milliseconds, reason, tone = 'muted') {
    this.onProgress?.({ stage: 'cooldown', label: `${reason} (${durationLabel(milliseconds)})` });
    this.onActivity?.(`${reason}. The task will resume automatically in ${durationLabel(milliseconds)}.`, tone);
    await this.onCheckpoint?.();
    await waitWithSignal(milliseconds, this.signal);
  }

  async beforeAction() {
    if (
      this.completedActions > 0
      && this.completedActions % this.config.requestBatchSize === 0
      && this.lastBatchCooldownAt !== this.completedActions
    ) {
      await this.pause(
        randomBetween(this.config.batchCooldownMinMs, this.config.batchCooldownMaxMs),
        'Taking a scheduled batch cooldown'
      );
      this.lastBatchCooldownAt = this.completedActions;
    }
    if (this.completedActions > 0) {
      await waitWithSignal(
        randomBetween(this.config.requestDelayMinMs, this.config.requestDelayMaxMs),
        this.signal
      );
    }
  }

  async run(getPage, operation) {
    const backoffs = Array.isArray(this.config.rateLimitBackoffMs)
      ? this.config.rateLimitBackoffMs
      : [];
    for (let attempt = 0; attempt <= backoffs.length; attempt += 1) {
      await this.beforeAction();
      const page = getPage();
      try {
        if (await pageIsRateLimited(page)) throw rateLimitError();
        const result = await operation(page);
        if (await pageIsRateLimited(getPage())) throw rateLimitError();
        this.completedActions += 1;
        return result;
      } catch (error) {
        const limited = /rate limit|too many requests|requests too quickly/i.test(error.message)
          || await pageIsRateLimited(getPage());
        if (!limited) throw error;
        if (attempt >= backoffs.length) {
          throw new Error('ChatGPT is still temporarily limiting requests. Your checkpoint is saved; wait and resume later.');
        }
        await this.pause(backoffs[attempt], 'ChatGPT temporarily limited requests', 'warning');
        await dismissRateLimitNotice(getPage());
      }
    }
    throw new Error('ChatGPT remained rate limited after all cooldown attempts. Your checkpoint was saved; try again later.');
  }
}
