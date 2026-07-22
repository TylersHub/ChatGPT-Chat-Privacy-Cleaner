# ClearSlate

ClearSlate is a local-first app for finding, reviewing, and carefully deleting ChatGPT conversations. You choose the search keywords, inspect every match, and explicitly approve only the unpinned chats you want removed.

The app uses the visible ChatGPT interface through Playwright. It does not use undocumented ChatGPT APIs, extract cookies, ask for access tokens, or save full conversation text in reports.

## Features

- Enter up to 50 focused search keywords.
- Optionally generate keyword suggestions with your own OpenAI API key.
- Watch live progress while ClearSlate searches and inspects matching chats.
- Review titles, matched keywords, links, and detected pin state.
- Automatically protect pinned chats and any chat whose pin state is uncertain.
- Confirm the exact selected count before deletion.
- Watch deletion progress and receive a timestamped local audit report.

## Requirements

- Windows, macOS, or Linux
- Node.js 20 or newer
- Google Chrome
- A ChatGPT account
- An OpenAI API key only if you want AI keyword suggestions

## Windows setup

Open PowerShell in this folder and run:

```powershell
powershell -ExecutionPolicy Bypass -File .\setup.ps1
```

Then start the app:

```powershell
powershell -ExecutionPolicy Bypass -File .\start.ps1
```

ClearSlate builds the interface, starts a server available only at `127.0.0.1`, and opens the app in your default browser. Keep the PowerShell window open while using it. Press `Ctrl+C` there to stop.

## macOS and Linux setup

```bash
chmod +x setup.sh
./setup.sh
npm start
```

## Manual setup

```bash
npm install
npm test
npm run build
npm run doctor
npm start
```

For development with Vite middleware and source maps:

```bash
npm run dev
```

## How to use ClearSlate

### 1. Connect

Click **Open Chrome to sign in**. ClearSlate opens normal installed Chrome with a separate profile stored in `automation-profile`. Complete ChatGPT login, wait for the normal chat home screen, and close that Chrome window. Back in ClearSlate, click **I signed in and closed Chrome**.

Google can reject sign-in pages controlled by browser automation. ClearSlate therefore performs initial login in normal Chrome, then reuses the dedicated authenticated profile for scanning.

Do not point ClearSlate at your everyday Chrome profile. The dedicated profile protects your normal browsing data and avoids conflicts with an already-running profile.

### 2. Choose keywords

Add focused words or short phrases that might appear in conversations you want to review. Specific phrases such as `passport number`, `medical results`, or `salary negotiation` work better than broad words such as `work` or `account`.

For AI suggestions, describe the kinds of chats you are concerned about and enter your OpenAI API key. Your description is sent to OpenAI only when you click **Generate suggestions**. The API key is used for that request and is never persisted, included in reports, or placed in the server's shared state. Generated suggestions are editable and are not automatically used until you save them.

### 3. Scan

Click **Start scan**. A Chrome window opens while ClearSlate uses ChatGPT's normal history search, opens matching chats, checks visible text locally, and inspects each conversation menu for pin state.

ClearSlate spaces browser actions by 5-10 seconds and takes a longer cooldown after each batch. If ChatGPT displays a request-limit warning, it saves a checkpoint, waits with progressively longer backoff, and resumes automatically. Cancelling or closing ClearSlate keeps the checkpoint; starting the same scan or deletion again resumes it. **Reset session** clears saved checkpoints.

The progress bar covers both keyword searching and match inspection. Scanning never deletes chats. You can request cancellation at any time.

### 4. Review

Review every candidate. Only chats whose current menu positively indicates that they are unpinned can be selected. Pinned chats and chats with an unknown pin state are protected and disabled.

Click the external-link icon to inspect a candidate directly in ChatGPT before selecting it.

### 5. Delete

ClearSlate displays the exact selected count. Type the requested confirmation, such as `DELETE 3`, before deletion begins.

Immediately before deleting each chat, ClearSlate verifies the conversation ID and checks the live menu again. If the chat is now pinned or the menu is uncertain, it is skipped. A live deletion progress bar and activity list show the result of every attempt.

Deletion is permanent through the ChatGPT interface. Request a ChatGPT account-data export first if you may need a backup.

## Local data

The following folders are created locally and excluded from Git:

- `automation-profile/`: dedicated Chrome login state
- `data/`: saved keyword preferences
- `output/`: scan, approval, and deletion reports

Reports contain titles, conversation URLs, matched keywords, pin state, and action results. They do not contain full conversation bodies.

Delete `automation-profile/` while ClearSlate is stopped if you want to remove its saved ChatGPT session completely.

## Optional configuration

Copy `config.example.json` to `config.json` for advanced settings:

```powershell
Copy-Item config.example.json config.json
```

You can set a nonstandard Chrome executable path, change the localhost port, adjust UI wait timing, or choose another compatible OpenAI text model. `config.json` is ignored by Git.

## Troubleshooting

### Google says the browser or app may not be secure

Close the automated Chrome window and return to **Connect**. Use **Open Chrome to sign in**, complete login in that normal Chrome window, close it, then verify the connection. Do not add stealth plugins, copy cookies, or weaken Chrome security settings.

### The dedicated profile is already in use

Close every Chrome window opened by ClearSlate, wait a few seconds, and try again. The same profile cannot be open in normal Chrome and Playwright at the same time.

### Chat search or pin detection stops working

The ChatGPT interface may have changed. Stop and update the accessibility-based locators in `server/chatgpt.mjs`. Do not interpret an unknown state as unpinned and do not replace the checks with screen coordinates.

### Chrome is installed in a nonstandard location

Copy `config.example.json` to `config.json` and set `browserExecutablePath` to the full Chrome executable path, then run `npm run doctor`.

### The app port is busy

ClearSlate tries up to ten local ports beginning with `4317`. The active URL is printed in the terminal.

## Important limitations

- ChatGPT's interface and search behavior can change.
- Keyword search may not discover chats that do not contain your terms.
- ClearSlate manages conversations only. It does not remove ChatGPT Memory entries, Library files, account exports, or copies imported by other users.
- Deletion reports confirm the app's observed result, not external retention policies.

## License

MIT. See [LICENSE](LICENSE).
