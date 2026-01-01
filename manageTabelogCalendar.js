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
 * Formats the calendar entry object into a multi-line description string.
 * This function is used by all three calendar operations.
 */
function formatReservationDescription(entry) {
  const details = [
    `Diner Name: ${entry.dinerName}`,
    `Phone: ${entry.phoneNumber || 'N/A'}`,
    `Guests: ${entry.guestCount}`,
    `Course/Plan: ${entry.coursePlan || 'お席のみ'}`,
    `Table: ${entry.table || '未定'}`,
    // Use an identifiable keyword for searching by Booking ID
    `Tabelog Booking ID: ${entry.bookingId}`,
    `Changes Log: ${entry.changes || 'N/A'}`,
    `Cancellation Reason: ${entry.cancellationReason || 'N/A'}`
  ];
  return details.join('\n'); // Using a newline separated format for readability
}

/**
 * Retrieves the specific calendar object.
 */
function getTargetCalendar() {
  const calendar = CalendarApp.getCalendarById(config().calendarId);
  if (!calendar) {
    throw new Error(`Calendar with ID ${config().calendarId} not found. Check CALENDAR_ID.`);
  }
  return calendar;
}

/**
 * Searches the target calendar for an event by the unique Booking ID in the description.
 * Searches from now up to 6 months in the future.
 */
function findEventByBookingId(calendar, bookingId) {
  const lookaheadDays = 180; // Search next 6 months
  const now = new Date();
  const future = new Date(now.getTime());
  future.setDate(now.getDate() + lookaheadDays);

  const events = calendar.getEvents(now, future);

  for (const event of events) {
    const description = event.getDescription() || '';
    // Look for the unique "Tabelog Booking ID: [ID]" string
    if (description.includes(`Tabelog Booking ID: ${bookingId}`)) {
      return event;
    }
  }
  return null;
}

/**
 * Processes a new reservation and creates a calendar event.
 */
function processNewReservation(calendarEntry) {
  const calendar = getTargetCalendar();
  
  // Date/Time calculation for GAS Date objects (e.g., "2025-12-13T18:00")
  const dateString = calendarEntry.finalReservationDate.replace(/\//g, '-'); 
  const startTimeString = `${dateString}T${calendarEntry.time}`;
  
  const startTime = new Date(startTimeString);
  const endTime = new Date(startTime.getTime() + (90 * 60 * 1000)); // Add 90 minutes (1h30m)

  const title = `${calendarEntry.dinerName} (${calendarEntry.guestCount}名)`;
  const description = formatReservationDescription(calendarEntry);

// 1. Create the event
    calendar.createEvent(title, startTime, endTime, {
      description: description
  });
  
// 2. SLACK NOTIFICATION ---
  sendSlackNotification(
    "🛎️ NEW RESERVATION ALERT", 
    calendarEntry, 
    "good" // Green
  );
  // --------------------------
  Logger.log(`Created new reservation event: ${title}.`);
}

/**
 * Processes an updated reservation by searching for the old event and modifying it.
 */
function processChangedReservation(calendarEntry) {
  const calendar = getTargetCalendar();
  const event = findEventByBookingId(calendar, calendarEntry.bookingId);

  if (event) {
    // 1. Calculate new start and end times
    const dateString = calendarEntry.finalReservationDate.replace(/\//g, '-');
    const newStartTimeString = `${dateString}T${calendarEntry.time}`;
    
    const newStartTime = new Date(newStartTimeString);
    const newEndTime = new Date(newStartTime.getTime() + (90 * 60 * 1000));

    // 2. Prepare updated data
    const new_title = `[Updated] ${calendarEntry.dinerName} (${calendarEntry.guestCount}名)`;
    const new_description = formatReservationDescription(calendarEntry);

    // 3. Modify the event
    event.setTitle(new_title);
    event.setDescription(new_description);
    event.setTime(newStartTime, newEndTime); 
  
  // 4. SLACK NOTIFICATION ---
    sendSlackNotification(
      "⚠️ RESERVATION MODIFIED", 
      calendarEntry, 
      "warning" // Yellow
    );
    // --------------------------

    Logger.log(`Updated event for Booking ID ${calendarEntry.bookingId}`);
  } else {
    Logger.log(`Original event for Booking ID ${calendarEntry.bookingId} not found. Creating new event.`);
    processNewReservation(calendarEntry); // Fallback
  }
}

/**
 * Processes a cancelled reservation by searching for the old event and modifying its title.
 */
function processCancelledReservation(calendarEntry) {
  const calendar = getTargetCalendar();
  const event = findEventByBookingId(calendar, calendarEntry.bookingId);

  if (event) {
    // 1. Prepare cancellation update
    const currentTitle = event.getTitle();
    // Only prepend [Cancelled] if it's not already there
    const cancelled_title = currentTitle.startsWith('[Cancelled]') ? currentTitle : `[Cancelled] ${currentTitle}`;
    
    // 2. Re-generate the description to reflect cancellation reason
    const new_description = formatReservationDescription(calendarEntry); 

    // 3. Modify the event
    event.setTitle(cancelled_title);
    event.setDescription(new_description);

  // 4. SLACK NOTIFICATION ---
    sendSlackNotification(
      "❌ RESERVATION CANCELLED", 
      calendarEntry, 
      "danger" // Red
    );
    // --------------------------    
    Logger.log(`Marked event for Booking ID ${calendarEntry.bookingId} as Cancelled.`);
  } else {
    Logger.log(`Cancelled event for Booking ID ${calendarEntry.bookingId} not found in calendar.`);
  }
}

