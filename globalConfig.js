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

function config() {
  try {
    const scriptProperties = PropertiesService.getScriptProperties();

    return {
      label: {
        new: "TabelogInbox",
        done: "TabelogRegistered",
        contact: "contact"
      },
      spreadSheetId: scriptProperties.getProperty("SPREADSHEET_ID"),
      sheetName: scriptProperties.getProperty("SHEET_NAME"),
      calendarId: scriptProperties.getProperty("CALENDAR_ID"),
      slackWebhookUrl: scriptProperties.getProperty("SLACK_WEBHOOK_URL")
    }  
  } catch (err) {
      console.log("Failed with error %s", err.message);
  }
}
