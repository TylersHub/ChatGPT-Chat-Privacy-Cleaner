const initialProgress = () => ({
  stage: 'idle',
  current: 0,
  total: 0,
  percent: 0,
  label: '',
  activity: []
});

export class AppState {
  constructor({ config, keywords = [] }) {
    this.config = config;
    this.value = {
      connected: false,
      loginOpened: false,
      job: null,
      resumableJob: null,
      keywords,
      candidates: [],
      approvedIds: [],
      deletionResults: [],
      progress: initialProgress(),
      error: null,
      notice: null,
      paths: {
        profile: config.profileDir,
        output: config.outputDir,
        browser: null
      }
    };
    this.abortController = null;
  }

  snapshot() {
    return structuredClone(this.value);
  }

  patch(next) {
    this.value = { ...this.value, ...next };
  }

  setProgress(next) {
    const total = Math.max(0, Number(next.total ?? this.value.progress.total));
    const current = Math.max(0, Math.min(total || Infinity, Number(next.current ?? this.value.progress.current)));
    const percent = next.percent ?? (total ? Math.round((current / total) * 100) : 0);
    this.value.progress = {
      ...this.value.progress,
      ...next,
      current,
      total,
      percent: Math.max(0, Math.min(100, Math.round(percent)))
    };
  }

  addActivity(message, tone = 'muted') {
    const activity = [
      { id: `${Date.now()}-${Math.random()}`, message, tone },
      ...this.value.progress.activity
    ].slice(0, 12);
    this.setProgress({ activity });
  }

  startJob(job) {
    if (this.value.job) throw new Error('Another task is already running.');
    this.abortController = new AbortController();
    this.patch({ job, error: null, notice: null, progress: initialProgress() });
    return this.abortController.signal;
  }

  finishJob(notice = null) {
    this.abortController = null;
    this.patch({ job: null, notice });
  }

  failJob(error) {
    this.abortController = null;
    this.patch({ job: null, error: error.message || String(error) });
  }

  cancelJob() {
    if (!this.abortController) return false;
    this.abortController.abort();
    this.addActivity('Cancellation requested. Finishing the current browser action.', 'warning');
    return true;
  }
}
