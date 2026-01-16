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

/**
 * Parses the daily Tabelog reservation summary email and writes the data to a Google Sheet.
 * This script is designed for the OWNER summary email format, which lists multiple reservations.
 */
function parseTabelogDailySummary() {
  // --- Configuration ---
  const SPREADSHEET_ID = 'YOUR_SPREADSHEET_ID_HERE'; // <-- IMPORTANT: Replace with your actual Sheet ID
  const SHEET_NAME = 'DailyReservations';
  // Use a label you create to easily find these summary emails
  const LABEL_NAME = 'TabelogDailySummary'; 

  // --- Setup ---
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);

  // Define the row headers if the sheet is new/empty
  if (sheet.getLastRow() < 1) {
    sheet.appendRow(['Date Parsed', 'Reservation Date', 'Reservation Time', 'Guest Count', 'Diner Name']);
  }

  const label = GmailApp.getUserLabelByName(LABEL_NAME);
  if (!label) {
    Logger.log(`Label "${LABEL_NAME}" not found. Exiting.`);
    return;
  }

  const threads = label.getThreads();
  const currentYear = new Date().getFullYear(); // Use the current year (2025 in this context)

  threads.forEach(thread => {
    const messages = thread.getMessages();
    const message = messages[messages.length - 1]; 
    const plainBody = message.getPlainBody();
    const dateParsed = new Date();

    // --- Step 1: Extract the overall Reservation Date (e.g., "12/13") ---
    // Regex: Searches for "本日（" followed by Month/Day
    const dateHeaderMatch = plainBody.match(/本日[（\(](\d{1,2}\/\d{1,2})[）\)]/);
    if (!dateHeaderMatch) {
        Logger.log("Could not find Reservation Date header. Skipping thread.");
        return;
    }
    // Formats the date string: e.g., "2025/12/13"
    const todayReservationDate = `${currentYear}/${dateHeaderMatch[1]}`; 

    // --- Step 2: Isolate the reservation list block ---
    // The content is between the start tag and the next line break/separator
    const startTag = '＜本日の食べログネット予約一覧＞';
    const startIndex = plainBody.indexOf(startTag);
    
    if (startIndex === -1) {
        Logger.log("Could not find reservation list block. Skipping thread.");
        return;
    }

    // Capture the block content starting 1 line after the tag
    let reservationBlock = plainBody.substring(startIndex + startTag.length);
    
    // Use a regex to find the end of the list block (before the summary time stamp line)
    const endIndex = reservationBlock.search(/\*(\d{1,2})月(\d{1,2})日(\d{1,2}:\d{2}) 時点/);

    if (endIndex !== -1) {
      reservationBlock = reservationBlock.substring(0, endIndex);
    }

    // Split the block into individual lines and clean them up
    const lines = reservationBlock.split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0 && line.match(/\d{1,2}:\d{2}～/)); // Filter for lines starting with Time

    // --- Step 3: Parse each reservation line ---
    const dataToWrite = [];
    
    // Regex for an individual line: Time (Group 1), Count (Group 2), Name (Group 3)
    const lineRegex = /(\d{1,2}:\d{2})～\s+(\d+)名\s+(.+)\s+様/
    
    lines.forEach(line => {
      const match = line.match(lineRegex);
      
      if (match && match.length >= 4) {
        const time = match[1];
        const count = match[2];
        const name = match[3].trim(); // Diner name, e.g., "城代 （ジョウダイ）"

        dataToWrite.push([
          dateParsed, 
          todayReservationDate, 
          time, 
          count, 
          name
        ]);
      }
    });

    // --- Step 4: Write all found reservations to the sheet ---
    if (dataToWrite.length > 0) {
      sheet.getRange(sheet.getLastRow() + 1, 1, dataToWrite.length, dataToWrite[0].length).setValues(dataToWrite);
    }

    // OPTIONAL: Mark the thread as processed
    thread.markRead();
    thread.removeLabel(label); 
  });
}