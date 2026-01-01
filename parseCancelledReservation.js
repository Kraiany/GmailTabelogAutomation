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
 * Parses a single Tabelog reservation CANCELLATION notification email.
 */
/**
 * Parses a single Tabelog reservation CANCELLATION notification email.
 * OUTPUT COLUMNS ALIGN WITH parseSingleTabelogReservation() plus a reason column.
 */
function parseCancelledReservation() {
  // --- Configuration ---
  const SPREADSHEET_ID = config().spreadSheetId;
  const SHEET_NAME = config().sheetName;
  const LABEL_NAME = config().label.cancel;

  // --- Setup ---
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
  
  // Note: This header is adjusted to match the data being written below.
  if (sheet.getLastRow() < 1) {
    sheet.appendRow([
      'Date Parsed', 
      'Diner Name', 
      'Phone', 
      'Reservation Date', 
      'Reservation Time', 
      'Guest Count', 
      'Course/Plan (Status)', // Placeholder Col 7
      'Table (Status)',       // Placeholder Col 8
      'Booking ID',           // Col 9
      'Changes',
      'Cancellation reason'
    ]);
  }

  // const label = GmailApp.getUserLabelByName(LABEL_NAME);
  // if (!label) {
  //   Logger.log(`Label "${LABEL_NAME}" not found. Exiting.`);
  //   return;
  // }

  // const threads = label.getThreads();
  const currentYear = new Date().getFullYear(); 

  // --- REUSED ROBUST EXTRACTION FUNCTIONS ---
  const extractValue = (body, key) => {
    // Regex: Key, optional spaces, Colon/Semicolon, optional spaces, Capture Group, Line break
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


  // threads.forEach(thread => {
    const messages = thread.getMessages();
    const message = messages[messages.length - 1]; 
    const plainBody = message.getPlainBody();
    const dateParsed = new Date();
    
    // --- Step 1: Extract Data ---
    const bookingId = extractBookingId(plainBody);
    const dinerName = extractValue(plainBody, 'お名前'); 
    const phoneNumber = extractValue(plainBody, '電話番号');
    const dateMMDD = extractValue(plainBody, '日付'); 
    const time = extractValue(plainBody, '来店時刻'); 
    const guestCount = extractValue(plainBody, '人数'); 
    
    // Special extraction for the reason
    // const reasonMatch = plainBody.match(/キャンセル理由\s*[：:]\s*(.+?)[\\r\\n]/);
    // const cancellationReason = reasonMatch ? reasonMatch[1].trim() : 'N/A';

    const reasonRegex = /キャンセル理由[\s\u00a0：:]*(.+?)(?=\s*[\r\n]|$)/m;
    const reasonMatch = plainBody.match(reasonRegex);

    let cancellationReason = 'N/A';
    if (reasonMatch && reasonMatch[1]) {
        // Trim and remove any surrounding brackets that might have been captured
        cancellationReason = reasonMatch[1].trim().replace(/^【|】$/g, '');
    }
    
    // For logging/debugging:
    Logger.log(`Cancellation Reason Match: ${cancellationReason}`);    
    // --- Step 2: Infer Year ---
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

    // --- Step 3: Write the data to match the column structure ---
    sheet.appendRow([
      dateParsed,                                    // Col 1: Date Parsed
      dinerName,                                     // Col 2: Diner Name
      phoneNumber,                                   // Col 3: Phone
      finalReservationDate,                          // Col 4: Reservation Date
      time,                                          // Col 5: Reservation Time
      guestCount,                                    // Col 6: Guest Count
      'CANCELLED',                                   // Col 7: Course/Plan (Status)
      'CANCELLED',                                   // Col 8: Table (Status)
      bookingId,                                     // Col 9: Booking ID
      "N/A",
      cancellationReason                             // Col 11: Cancellation Reason
    ]);

    const calendarEntry = {
      dateParsed: dateParsed,                                    // Col 1: Date Parsed
      dinerName: dinerName,
      phoneNumber: phoneNumber,                                   // Col 3: Phone
      finalReservationDate: finalReservationDate,                          // Col 4: Reservation Date
      time: time,                                          // Col 5: Reservation Time
      guestCount: guestCount,                                    // Col 6: Guest Count
      coursePlan: 'CANCELLED',                                   // Col 7: Course/Plan (Status)
      table: 'CANCELLED',                                   // Col 8: Table (Status)
      bookingId: bookingId,                                     // Col 9: Booking ID
      changes: "N/A",
      cancellationReason: cancellationReason                             // Col 11: Cancellation Reason
    };
    Logger.log("Cancelled reservation:" + JSON.stringify(calendarEntry));
    processCancelledReservation(calendarEntry);

    // Optional processing: Mark the thread as processed
    // thread.markRead();
    // thread.removeLabel(label); 
}  


// Example subject: 【予約キャンセル】予約がキャンセルされました。 (11月9日(日) 12:00 4名様)【食べログネット予約】
/*******

Example body:

ウクライナカフェ・クラヤヌィ 様

----------------------------------------
！本メールは食べログより自動送信している予約通知メールです！
※ご返信されても予約者様には送信されません。
　予約者様の電話番号・メールアドレスをご確認の上、直接、
　ご連絡をお願いいたします。
※本メールにご返信いただいてもお答えできませんので、ご了承ください。
----------------------------------------

お客様により下記予約内容がキャンセルされました。

お名前 ：水沼（みずぬま） 様
電話番号 ：08067611643
日付 ：11/09
来店時刻 ：12:00
滞在可能時間 ：1時間
人数 ：4名
コース ：お席のみのご予約
卓 ：テーブル1 (テーブル席)[禁煙]、テーブル2 (テーブル席)[禁煙]
ご要望 ：

キャンセル理由 ：【予定がなくなったため】

キャンセルポリシー：
本予約をキャンセルされた場合、下記の料金を頂戴いたします。
当日キャンセル（連絡なし）：3,000円（1名あたり）


個人情報はメールでご確認いただくことができません。
必ず下記管理画面にて【お客様のお名前(フルネーム)】等の個人情報をご確認いただき
予約台帳の修正をお願い申し上げます。

https://owner.tabelog.com/tn/time-schedule/2025-11-09?bookingId=net:35208488

ご確認をよろしくお願いいたします。

●ネット予約が入った際に電話/FAXでもお知らせしています。ご希望の方は、下記より設定ください。
https://owner.tabelog.com/tn/config/index/

+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
株式会社カカクコム　食べログ店舗会員サポート
TEL： 03-4446-3511
メール： owner_support@tabelog.com
食べログ店舗会員ヘルプ： https://owner-support.tabelog.com/
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
*/
