# GmailTabelogAutomation

Automates ingestion of Tabelog reservation emails, writes structured rows to a Google Sheet, creates/updates/cancels Google Calendar events, and posts Slack notifications.

## Quick overview

- Entrypoint: `masterTabelogProcessor.js` (schedule this as a time-driven trigger or run manually)
- Parsers: `parseTabelogReservation.js`, `parseChangedReservation.js`, `parseCancelledReservation.js`, `parseTabelogDailySummary.js`
- Calendar helpers: `manageTabelogCalendar.js`
- Slack: `sendSlackNotification.js`
- Config: `globalConfig.js` and Script Properties

## Setup in Google Apps Script (GAS)

1. Open the Google Apps Script editor (script.google.com) and create a new project.
2. In Project Settings, set the script runtime to V8 and timezone to Asia/Tokyo (the included `appsscript.json` already contains these settings).
3. Copy or import all repository files into the GAS project files.
4. Set the following Script Properties (Project Settings > Script properties):
   - `SPREADSHEET_ID` — Google Sheet ID where reservations will be appended
   - `SHEET_NAME` — name of the sheet/tab to use
   - `CALENDAR_ID` — target Calendar ID for events
   - `SLACK_WEBHOOK_URL` — (optional) Slack incoming webhook URL for notifications
5. Create Gmail labels to match `globalConfig.js` values (defaults: `TabelogInbox`, `TabelogRegistered`, `contact`). Attach incoming messages to `TabelogInbox`.
6. Deploy: run `masterTabelogProcessor` in the Apps Script editor to verify processing. Use Logger logs and Executions to debug.

## Using clasp for local development and GitHub sync

This project is a Google Apps Script project (server-side JS). Use `clasp` to develop locally and sync with GitHub.

1. Install Node.js (if you don't already have it).
2. Install clasp globally:

```bash
npm install -g @google/clasp
```

3. Authenticate clasp:

```bash
clasp login
```

4. Clone / initialize the project locally

If you're starting from this repo, cd into the folder and run:

```bash
clasp create --type standalone --title "GmailTabelogAutomation" --rootDir ./
```

Or, if the GAS project already exists, pull it:

```bash
clasp clone <SCRIPT_ID>
```

5. Push changes to Apps Script:

```bash
clasp push
```

6. Pull remote changes:

```bash
clasp pull
```

Notes:
- `clasp` expects a `package.json` in some flows but is not required. This repo is plain GAS files, which `clasp` can push/pull directly.
- Keep `appsscript.json` intact (it sets runtime and timeZone).

## Testing and debugging tips

- Use `Logger.log()` inside functions; view logs in Executions > Logs in the Apps Script editor.
- To avoid duplicate processing while testing, consider creating a temporary label and only moving test threads into that label.
- The parsers use `message.getPlainBody()` and regex-based `extractValue()` helpers — small template changes on Tabelog emails can break parsing. Check `bookingId` extraction (`bookingId=net:(\d{8})`) if calendar events are not found.

## Safety / Re-run guidance

- The router marks threads read and moves them from the new inbox label to `TabelogRegistered` after processing. If you need to re-process, move the thread back to `TabelogInbox` and mark it unread.

## Author

Kraiany (repository owner)

## License

This project is licensed under the GNU General Public License v3.0 (GPLv3). See `LICENSE`.

Note: All JavaScript source files include a short GPLv3 header comment at the top.
