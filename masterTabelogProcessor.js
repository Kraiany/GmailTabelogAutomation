/*
 * Copyright (C) 2025 Kraiany,
 * Dmytro Kovalov <dmytro.kovalov@gmail.com>
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

// --- Global Configuration (Define your sheet ID here once) ---
const MASTER_SPREADSHEET_ID = config().spreadSheetId; 
const MAIN_INBOX_LABEL = config().label.general; // Use one label for ALL Tabelog owner emails
const SHEET_NAME = config().sheetName;

// --- Function Router (The only function you need to schedule) ---
function masterTabelogProcessor() {
  const label = GmailApp.getUserLabelByName(config().label.new);
  const contactLabel = GmailApp.getUserLabelByName(config().label.contact);
  const registeredLabel = GmailApp.getUserLabelByName(config().label.done);

  if (!label) {
    Logger.log(`Master label "${MAIN_INBOX_LABEL}" not found. Please create it.`);
    return;
  }

  // Get all threads under the master label that are currently UNREAD
  const threads = label.getThreads(); 

  Logger.log(`Found ${threads.length} threads to process.`);

  threads.forEach(thread => {
    // We only process the latest message in the thread
    const message = thread.getMessages().pop(); 
    const subject = message.getSubject();
    
    // We only process unread messages to avoid reprocessing
    // if (!message.isUnread()) {
    //   return;
    // }

    // --- Subject-Based Routing Logic ---
    let handled = false;

    if (subject.includes('ネット予約一覧')) {
      // 1. Daily Summary Email
      Logger.log(`Ignoring thread (Subject: ${subject}) -- Daily Summary parser.`);
      // parseTabelogDailySummary(thread);
      handled = true;

    } else if (subject.includes('新しい予約が入りました')) {
      // 2. New Individual Reservation
      Logger.log(`Routing thread (Subject: ${subject}) to New Reservation parser.`);
      parseTabelogReservation(thread);
      handled = true;

    } else if (subject.includes('予約内容が変更されました')) {
      // 3. Reservation Change Notification
      Logger.log(`Routing thread (Subject: ${subject}) to Reservation Change parser.`);
      parseChangedReservation(thread);
      handled = true;

    } else if (subject.includes('予約内容がキャンセルされました')) {
      // 4. Reservation Cancellation
      Logger.log(`Routing thread (Subject: ${subject}) to Cancellation parser.`);
      parseCancelledReservation(thread);
      handled = true;
    }
    
    if (handled) {
      // Mark as read and remove the master label after successful processing
      thread.markRead();
      thread.removeLabel(label); // Optional: Keep the label for filtering later
      thread.removeLabel(contactLabel);
      thread.addLabel(registeredLabel);
    } else {
      Logger.log(`WARNING: Unhandled subject found: ${subject}`);
    }
  });
}