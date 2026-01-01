## Purpose

This repository is a Google Apps Script project that ingests reservation emails from Tabelog (Japanese restaurant booking platform), extracts structured reservation data, writes rows to a Google Sheet, creates/updates/cancels Google Calendar events, and posts Slack notifications.

## Big-picture architecture

- masterTabelogProcessor.js is the single scheduled entrypoint. It reads threads under a configured Gmail label and routes each message to one of the parsers by subject text.
- Parsers: `parseTabelogReservation.js`, `parseChangedReservation.js`, `parseCancelledReservation.js`, `parseTabelogDailySummary.js` extract structured fields using regex and write to the spreadsheet.
- Calendar helpers in `manageTabelogCalendar.js` create/update/cancel events. They identify events by a Booking ID string embedded in the event description: `Tabelog Booking ID: <id>`.
- `sendSlackNotification.js` posts Slack attachments (colors: `good|warning|danger`) using a webhook URL from script properties.

## Where configuration lives

- `globalConfig.js` reads Script Properties and exposes: `label` (new/done/contact), `spreadSheetId`, `sheetName`, `calendarId`, `slackWebhookUrl`.
- `appsscript.json` confirms runtime V8 and `timeZone: Asia/Tokyo`.
- Required Script Properties to set: `SPREADSHEET_ID`, `SHEET_NAME`, `CALENDAR_ID`, `SLACK_WEBHOOK_URL`.

## Routing and conventions (concrete examples)

- Router (masterTabelogProcessor): it looks up Gmail label `config().label.new` (example value in repo: `TabelogInbox`) and checks the message subject for these Japanese phrases to route:
  - Daily summary: contains "ネット予約一覧" (ignored/handled by daily summary parser)
  - New reservation: contains "新しい予約が入りました"
  - Changed reservation: contains "予約内容が変更されました"
  - Cancellation: contains "予約内容がキャンセルされました"
- Parsers use an `extractValue(plainBody, key)` helper with keys like `お名前`, `電話番号`, `日付`, `来店時刻`, `人数`, `コース`, `席`.
- Booking ID extraction uses the regex: `bookingId=net:(\d{8})` and falls back to `'N/A'`.

## Spreadsheet & Calendar contract

- Parsers append rows to the configured sheet. Column mapping is consistent across files (Date Parsed, Diner Name, Phone, Reservation Date, Reservation Time, Guest Count, Course/Plan, Table, Booking ID, Changes, Cancellation reason).
- Calendar event title format for new reservations: `${dinerName} (${guestCount}名)`.
- Event description always includes a block that contains `Tabelog Booking ID: <id>` so `findEventByBookingId()` can locate events. The calendar search looks up events from now to 180 days ahead.
- New events are created as 90-minute blocks (start time = parsed time, end = +90 minutes).
- For updates the title is prefixed with `[Updated]`; for cancellations the title is prefixed with `[Cancelled]` (only if not already present).

## Slack integration

- Notifications use the webhook URL in Script Properties. Payloads use Slack attachments with fields for Diner, Guests, Date, Time, Booking ID, and optional `CHANGES` / `CANCELLATION REASON` fields.

## Important project-specific gotchas

- Year inference: parsers assume the reservation year is the current year unless the current month is December and the reservation month is January — then they add +1 to the year. This is a simple heuristic and can mis-assign year near other year boundaries.
- The router currently checks `message.isUnread()` in comments but processes threads regardless; be mindful when manually re-running to avoid duplicate processing.
- `masterTabelogProcessor.js` contains an unused `MAIN_INBOX_LABEL = config().label.general` which looks like a leftover/typo — most code uses `config().label.new` (e.g., `TabelogInbox`). If you change label keys in `globalConfig.js`, update references accordingly.
- Parsers rely on `message.getPlainBody()` and Japanese punctuation; small template changes from Tabelog can break regexes. If emails change, update the `extractValue` regexes and the bookingId pattern.

## How to run & test

- Deploy/run from the Google Apps Script editor (this is a GAS project, not an npm project). `appsscript.json` shows runtime V8.
- Create Gmail labels named to match `config().label.*` (default examples: `TabelogInbox`, `TabelogRegistered`, `contact`). Attach the inbound messages to the `TabelogInbox` label.
- Set Script Properties (Project Settings > Script properties) for `SPREADSHEET_ID`, `SHEET_NAME`, `CALENDAR_ID`, and `SLACK_WEBHOOK_URL`.
- Run `masterTabelogProcessor` manually in the Apps Script editor to test routing. Use representative example emails in the `TabelogInbox` label.

## Quick debugging tips

- Use `Logger.log(...)` (already present) to inspect parsed objects; view logs from the Apps Script Editor Executions or Stackdriver.
- If calendar events are not found, open the event description manually and search for `Tabelog Booking ID:` to confirm bookingId extraction and description format.
- To test Slack, temporarily set `SLACK_WEBHOOK_URL` and call `sendSlackNotification()` from the editor with a sample entry object.

## Files to inspect when making changes

- Routing & wiring: `masterTabelogProcessor.js`
- Extraction & sheet writes: `parseTabelogReservation.js`, `parseChangedReservation.js`, `parseCancelledReservation.js`, `parseTabelogDailySummary.js`
- Calendar behavior: `manageTabelogCalendar.js`
- Slack: `sendSlackNotification.js`
- Config: `globalConfig.js`, `appsscript.json`

If any of the label names, sheet structure, or email templates differ from what you see in production, tell me which files or messages differ and I will update these instructions and the parsing code accordingly.
