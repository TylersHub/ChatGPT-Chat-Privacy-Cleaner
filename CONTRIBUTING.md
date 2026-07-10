# Contributing

Thanks for helping improve ClearSlate.

1. Use Node.js 20 or newer and Google Chrome.
2. Run `npm install`, then `npm test` and `npm run build` before submitting changes.
3. Keep browser automation accessibility-based. Do not replace selectors with fixed screen coordinates.
4. Preserve the fail-closed deletion model: pinned and unknown states must never become selectable.
5. Never commit `automation-profile`, `data`, `output`, API keys, cookies, tokens, or real conversation reports.
6. Include focused tests for changes to validation, approval, or deletion behavior.

For UI changes, verify desktop and mobile layouts and keep control labels clear for non-technical users.

