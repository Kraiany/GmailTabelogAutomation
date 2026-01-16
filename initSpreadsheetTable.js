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

/**
 * Initializes the Tabelog reservation sheet with headers if needed.
 * Reads spreadsheet and sheet configuration from globalConfig, opens/creates the sheet,
 * and initializes headers if the sheet is new or empty.
 * 
 * @return {Sheet} The Google Sheet object, initialized and ready for writing data.
 *                 Headers are appended with 11 standard columns for Tabelog reservation data
 *                 if the sheet is new or has no rows.
 */
function initializeSheetHeaders() {
  // --- Configuration ---
  const SPREADSHEET_ID = config().spreadSheetId;
  const SHEET_NAME = config().sheetName;

  // --- Setup ---
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);

  // Initialize headers if sheet is new/empty
  if (sheet.getLastRow() < 1) {
    sheet.appendRow([
      'Date Parsed', 
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
    ]);
  }

  return sheet;
}
