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
 * Initializes the Tabelog reservation sheet with headers if needed.
 * Reads spreadsheet and sheet configuration from globalConfig, opens/creates the sheet,
 * and initializes headers if the sheet is new or empty.
 * 
 * @return {Sheet} The Google Sheet object, initialized and ready for writing data.
 *                 Headers are appended with 14 standard columns for Tabelog reservation data
 *                 if the sheet is new or has no rows.
 */
function initializeSheetHeaders() {
  // --- Setup ---
  const ss = SpreadsheetApp.openById(config().spreadSheetId);
  const sheet = ss.getSheetByName(config().sheetName) || ss.insertSheet(config().sheetName);

  // Initialize headers if sheet is new/empty
  if (sheet.getLastRow() < 1) {
    const headers = [
      'Date Parsed', 
      'Request Type',
      'Diner Name', 
      'Phone', 
      'Reservation Date',
      'Reservation Time',
      'New Reservation Date',
      'New Reservation Time',
      'Guest Count', 
      'Course/Plan', 
      'Table', 
      'Booking ID',
      'Changes',
      'Cancellation reason'
    ];
    sheet.appendRow(headers);
  }

  return sheet;
}
