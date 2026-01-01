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
 * Parses a single Tabelog reservation notification email (sent to the owner).
 * Subject example: 【新規予約】新しい予約が入りました。 (1月11日(日) 14:00- 2名様)【食べログネット予約】
 */
function parseTabelogReservation(thread) {
  // --- Configuration ---
  const SPREADSHEET_ID = config().spreadSheetId; // <-- IMPORTANT: Replace with your actual Sheet ID
  const SHEET_NAME = config().sheetName;
  // // Use a label you create to easily find these individual confirmation emails
  // const LABEL_NAME = config().label.create; 

  // --- Setup ---
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);

  // Define the row headers if the sheet is new/empty
  if (sheet.getLastRow() < 1) {
    sheet.appendRow([
      'Date Parsed', 
      'Diner Name', 
      'Phone', 
      'Reservation Date', 
      'Reservation Time', 
      'Guest Count', 
      'Course/Plan', 
      'Table', 
      'Booking ID',
      'Changes',
      'Cancellation reason'
    ]);
  }

  // Function to extract value using a label (key) and colon (：)
/**
 * Function to extract value using a label (key) and colon (：).
 * Uses a more robust regex pattern.
 */
const extractValue = (body, key) => {
    // 1. Pattern uses the 'g' (global) flag and 'm' (multiline) flag for flexibility, 
    //    but the match is run against the string using .match() which returns the first match.
    // 2. [\\s\\u00a0]* matches zero or more spaces/NBSP.
    // 3. (.+?) captures the value non-greedily.
    // 4. [\\r\\n] matches the line break (CR, LF, or CRLF).
    
    // The pattern: Key, optional spaces, Colon/Semicolon, optional spaces, Capture Group, Line break
    const regex = new RegExp(key + '[\\s\\u00a0]*[：:]' + '[\\s\\u00a0]*' + '(.+?)[\\r\\n]', 'm');
    const match = body.match(regex);
    
    // Logger.log(`Key: ${key}`);
    // Logger.log(`Regex Used: ${regex.source}`);
    // Logger.log(`Match Result: ${match}`);

    if (match && match[1]) {
      // Clean up the captured text: remove trailing symbols ('様', '名'), 
      // strip parentheses content (like phonetic readings), and trim whitespace.
      let cleanedValue = match[1].trim();
      
      // Specific cleanup for names (remove '様') and count (remove '名')
      cleanedValue = cleanedValue.replace(/様$|名$|\s*\[.*?\]/g, '').trim(); 
      
      return cleanedValue;
    }
    return 'N/A';
};
  
  // Function to extract value from a URL (specifically the booking ID)
  const extractBookingId = (body) => {
    // Searches for the booking ID in the URL format
    const regex = /bookingId=net:(\d{8})/;
    const match = body.match(regex);
    return match ? match[1] : 'N/A';
  };


    const message = thread.getMessages().pop(); 
    const plainBody = message.getPlainBody();
    const currentYear = new Date().getFullYear(); 
    const dateParsed = new Date();

    // --- Step 1: Extract all structured fields ---
    const dinerName = extractValue(plainBody, 'お名前'); 
    const phoneNumber = extractValue(plainBody, '電話番号');
    const dateMMDD = extractValue(plainBody, '日付'); // e.g., "01/11"
    const time = extractValue(plainBody, '来店時刻'); // e.g., "14:00"
    const guestCount = extractValue(plainBody, '人数'); // e.g., "2"
    const coursePlan = extractValue(plainBody, 'コース');
    const tableInfo = extractValue(plainBody, '卓');
    const bookingId = extractBookingId(plainBody);
    
    // Combine the current year with the MM/DD extracted
    const fullReservationDate = dateMMDD !== 'N/A' 
      ? `${currentYear}/${dateMMDD}` 
      : 'N/A';
      
    // Handle the year change (if the current date is Dec 2025 and booking is Jan 2026)
    // NOTE: If currentYear is 2025 and dateMMDD is "01/11", this will incorrectly use 2025.
    // We assume the reservation is for the near future.
    let finalReservationYear = currentYear;
    if (dateMMDD !== 'N/A') {
        const currentMonth = dateParsed.getMonth() + 1; // 1-indexed month
        const reservationMonth = parseInt(dateMMDD.substring(0, 2), 10);
        
        // If the current month is late in the year (e.g., Dec) and the reservation month 
        // is early (e.g., Jan), it's likely next year.
        if (currentMonth === 12 && reservationMonth === 1) {
            finalReservationYear = currentYear + 1;
        }
    }
    const finalReservationDate = dateMMDD !== 'N/A' 
      ? `${finalReservationYear}/${dateMMDD}` 
      : 'N/A';


    // --- Step 2: Write data to the sheet ---
    sheet.appendRow([
      dateParsed, 
      dinerName, 
      phoneNumber, 
      finalReservationDate, 
      time, 
      guestCount, 
      coursePlan, 
      tableInfo, 
      bookingId,
      "",""
    ]);

    const calendarEntry = {
      dateParsed: dateParsed,                                    // Col 1: Date Parsed
      dinerName: dinerName,
      phoneNumber: phoneNumber,                                   // Col 3: Phone
      finalReservationDate: finalReservationDate,                          // Col 4: Reservation Date
      time: time,                                          // Col 5: Reservation Time
      guestCount: guestCount,                                    // Col 6: Guest Count
      coursePlan: coursePlan,                                   // Col 7: Course/Plan (Status)
      table: tableInfo,                                   // Col 8: Table (Status)
      bookingId: bookingId,                                     // Col 9: Booking ID
      changes: "N/A",
      cancellationReason: "N/A"                             // Col 11: Cancellation Reason
    };
    Logger.log("Creating reservation:" + JSON.stringify(calendarEntry));

    processNewReservation(calendarEntry);

    // OPTIONAL: Mark the thread as processed
    // thread.markRead();
    // thread.removeLabel(label); 
  
}