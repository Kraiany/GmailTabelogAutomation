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

// Example subject: 【予約変更】予約内容が変更されました。 (10月27日(月) 13:15 2名様)【食べログネット予約】

/**
 * Parses a single Tabelog reservation CHANGE notification email.
 *
 */
function parseChangedReservation(thread) {
  // --- Setup ---
  const sheet = initializeSheetHeaders();

  // const label = GmailApp.getUserLabelByName(LABEL_NAME);
  // if (!label) {
  //   Logger.log(`Label "${LABEL_NAME}" not found. Exiting.`);
  //   return;
  // }

  // const threads = label.getThreads();
  const currentYear = new Date().getFullYear(); 

  // --- REUSED ROBUST EXTRACTION FUNCTIONS ---
  const extractValue = (body, key) => {
    const regex = new RegExp(key + '[\\s\\u00a0]*[：:]' + '[\\s\\u00a0]*' + '(.+?)[\\r\\n]', 'm');
    const match = body.match(regex);
    if (match && match[1]) {
      let cleanedValue = match[1].trim();
      cleanedValue = cleanedValue.replace(/様$|名$|\s*\[.*?\]/g, '').trim(); 
      return cleanedValue;
    }
    return 'N/A';
  };
  
  const extractBookingId = (body) => {
    const regex = /bookingId=net:(\d{8})/;
    const match = body.match(regex);
    return match ? match[1] : 'N/A';
  };
  // ----------------------------------------


  //threads.forEach(thread => {
    const messages = thread.getMessages();
    const message = messages[messages.length - 1]; 
    const plainBody = message.getPlainBody();
    const dateParsed = new Date();
    
    // --- Step 1: Extract Data (using the full string for changed fields) ---
    const bookingId = extractBookingId(plainBody);
    const dinerName = extractValue(plainBody, 'お名前'); 
    const phoneNumber = extractValue(plainBody, '電話番号');
    const dateMMDD = extractValue(plainBody, '日付'); 
    
    // Extract full string including "Old -> New"
    const timeFull = extractValue(plainBody, '来店時刻'); 
    const guestCountFull = extractValue(plainBody, '人数'); 
    const coursePlan = extractValue(plainBody, 'コース');
    const tableInfo = extractValue(plainBody, '卓');
    
    // --- Step 2: Parse NEW values & Log Changes ---
    let newTime = timeFull;
    let newGuestCount = guestCountFull;
    let newDateMMDD = dateMMDD;
    let changesLog = [];

    // Date Change
    const dateChangeMatch = dateMMDD.match(/(\d{2}\/\d{2})\s*→\s*(\d{2}\/\d{2})/);
    if (dateChangeMatch) {
      newDateMMDD = dateChangeMatch[2];
      changesLog.push(`Date: ${dateChangeMatch[1]} -> ${newDateMMDD}`);
    } else {
      // If no change, clean up the original value to just MM/DD
      newDateMMDD = dateMMDD.replace(/[^0-9/]/g, '').trim();
    }

    // Time Change
    const timeChangeMatch = timeFull.match(/(\d{1,2}:\d{2})\s*→\s*(\d{1,2}:\d{2})/);
    if (timeChangeMatch) {
      newTime = timeChangeMatch[2]; 
      changesLog.push(`Time: ${timeChangeMatch[1]} -> ${newTime}`);
    } else {
      // If no change, clean up the original value to just HH:MM
      newTime = timeFull.replace(/[^0-9:]/g, '').trim();
    }

    // Guest Count Change
    const countChangeMatch = guestCountFull.match(/(\d+)\s*→\s*(\d+)/);
    if (countChangeMatch) {
      newGuestCount = countChangeMatch[2]; 
      changesLog.push(`Guests: ${countChangeMatch[1]} -> ${newGuestCount}`);
    } else {
       // If no change, clean up the original value to just digits
       newGuestCount = guestCountFull.replace(/[^0-9]/g, '').trim();
    }
    
    // --- Step 3: Infer Year ---
    // Infer year for original date
    let finalReservationYear = currentYear;
    if (dateMMDD !== 'N/A') {
        const currentMonth = dateParsed.getMonth() + 1; 
        const reservationMonth = parseInt(dateMMDD.substring(0, 2), 10);
        
        if (currentMonth === 12 && reservationMonth === 1) {
            finalReservationYear = currentYear + 1;
        }
    }
    const finalReservationDate = dateMMDD !== 'N/A' 
      ? `${finalReservationYear}/${dateMMDD}` 
      : 'N/A';

    // Infer year for new date (if date changed)
    let finalNewReservationYear = currentYear;
    let finalNewReservationDate = 'N/A';
    if (newDateMMDD !== 'N/A' && newDateMMDD !== dateMMDD.replace(/[^0-9/]/g, '').trim()) {
        const currentMonth = dateParsed.getMonth() + 1; 
        const newReservationMonth = parseInt(newDateMMDD.substring(0, 2), 10);
        
        if (currentMonth === 12 && newReservationMonth === 1) {
            finalNewReservationYear = currentYear + 1;
        }
        finalNewReservationDate = `${finalNewReservationYear}/${newDateMMDD}`;
    }

    const changes = changesLog.join('; ') || 'No Changes';
    // --- Step 4: Write the data to match the column structure (14 columns) ---
    sheet.appendRow([
      dateParsed,                                   // Col 1: Date Parsed
      'change',                                     // Col 2: Request Type
      dinerName,                                    // Col 3: Diner Name
      phoneNumber,                                  // Col 4: Phone
      finalReservationDate,                         // Col 5: Reservation Date
      newTime,                                      // Col 6: Reservation Time (NEW)
      finalNewReservationDate,                      // Col 7: New Reservation Date
      newTime,                                      // Col 8: New Reservation Time
      newGuestCount,                                // Col 9: Guest Count (NEW)
      coursePlan,                                   // Col 10: Course/Plan (Original value)
      tableInfo,                                    // Col 11: Table (Original value)
      bookingId,                                    // Col 12: Booking ID
      changes,                                      // Col 13: Changes Log
      ""                                            // Col 14: Cancellation Reason
    ]);

    const calendarEntry = {
      dateParsed: dateParsed,                                    // Col 1: Date Parsed
      dinerName: dinerName,
      phoneNumber: phoneNumber,                                   // Col 3: Phone
      finalReservationDate: finalNewReservationDate,                          // Col 4: Reservation Date
      time: newTime,                                          // Col 5: Reservation Time
      guestCount: newGuestCount,                                    // Col 6: Guest Count
      coursePlan: coursePlan,                                      // Col 7: Course/Plan
      table: tableInfo,                                            // Col 8: Table
      bookingId: bookingId,                                     // Col 9: Booking ID
      changes: changes,
      cancellationReason: "N/A"                             // Col 11: Cancellation Reason
    };
    Logger.log("Updating reservation:" + JSON.stringify(calendarEntry));
    processChangedReservation(calendarEntry);
    // Optional processing: Mark the thread as processed
    // thread.markRead();
    // thread.removeLabel(label); 

}