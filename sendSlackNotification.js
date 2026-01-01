/*
 * Copyright (C) 2025 Kraiany
 *
 * This file is part of GmailTabelogAutomation.
 *
 * GmailTabelogAutomation is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * GmailTabelogAutomation is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see <https://www.gnu.org/licenses/>.
 */

const SLACK_WEBHOOK_URL = config().slackWebhookUrl;
/**
 * Sends a notification message to Slack.
 * @param {string} title The main title of the notification (e.g., "[New Reservation]").
 * @param {object} entry The calendar entry object containing reservation data.
 * @param {string} color The color bar for the Slack message (e.g., 'good', 'warning', 'danger').
 */
function sendSlackNotification(title, entry, color) {
  // if (SLACK_WEBHOOK_URL === config().slackWebhookUrl) {
  //   Logger.log("Slack Webhook URL is not configured. Skipping notification.");
  //   return;
  // }
  
  // Format the main details into Slack 'fields' for a compact view
  const fields = [
    {
      "title": "Diner Name",
      "value": entry.dinerName,
      "short": true
    },
    {
      "title": "Guests",
      "value": `${entry.guestCount}名`,
      "short": true
    },
    {
      "title": "Date",
      "value": entry.finalReservationDate,
      "short": true
    },
    {
      "title": "Time",
      "value": entry.time,
      "short": true
    },
    {
      "title": "Booking ID",
      "value": entry.bookingId,
      "short": true
    },
    {
      "title": "Plan/Course",
      "value": entry.coursePlan || 'お席のみ',
      "short": true
    }
  ];

  // If there are changes or cancellations, add a dedicated field
  if (entry.changes && entry.changes !== 'N/A') {
    fields.push({ "title": "CHANGES", "value": entry.changes, "short": false });
  }
  if (entry.cancellationReason && entry.cancellationReason !== 'N/A') {
    fields.push({ "title": "CANCELLATION REASON", "value": entry.cancellationReason, "short": false });
  }

  // Optional: Include a link to the calendar event if available
  if (entry.eventUrl) {
      fields.push({ "title": "CALENDAR LINK", "value": `<${entry.eventUrl}|View Event>`, "short": false });
  }

  const payload = {
    "attachments": [
      {
        "mrkdwn_in": ["text"],
        "color": color, // 'good' (green), 'warning' (yellow), 'danger' (red)
        "pretext": `*${title}*`,
        "fields": fields,
        "ts": Math.floor(Date.now() / 1000) // Timestamp
      }
    ]
  };

  const options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload)
  };

  try {
    UrlFetchApp.fetch(SLACK_WEBHOOK_URL, options);
    Logger.log(`Slack notification sent for ${title}.`);
  } catch (e) {
    Logger.log(`Failed to send Slack notification: ${e.toString()} Entry: ${JSON.stringify(entry)}`);
  }
}
