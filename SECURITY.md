# Security policy

## Reporting a vulnerability

Please report security issues privately to the repository owner instead of opening a public issue. Include the affected version, reproduction steps, and potential impact. Do not include real ChatGPT conversation data, cookies, access tokens, API keys, or account credentials.

## Security boundaries

- ClearSlate binds its server to `127.0.0.1` and rejects non-local or cross-origin API requests.
- ChatGPT login state is kept in the ignored `automation-profile` folder.
- OpenAI API keys used for keyword generation are not persisted.
- Conversation bodies are inspected only in memory and are excluded from reports.
- Pinned or unknown-pin-state conversations cannot be approved for deletion.
- Conversation IDs and pin states are verified again immediately before deletion.

Users should keep ClearSlate, Node.js, Chrome, Playwright, and dependencies current. ChatGPT UI changes can affect browser automation; ambiguous UI states must continue to fail closed.

