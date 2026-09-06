const SPREADSHEET_ID = '1R-6wcwy5KWXY1uznNVCx6MB4vB0JTS3omGinEJA7tCc';
const SHEET_NAME = 'المشتركون';
const ALLOWED_SOURCES = ['storefront', 'products', 'popup', 'other'];

function doPost(e) {
  try {
    const payload = readPayload_(e);
    if (String(payload.website || '').trim()) {
      return json_({ ok: true, ignored: true });
    }

    const phoneLocal = normalizeEgyptianMobile_(payload.phone || '');
    if (!phoneLocal) return json_({ ok: false, error: 'INVALID_PHONE' });
    if (String(payload.consent) !== 'true') return json_({ ok: false, error: 'CONSENT_REQUIRED' });

    const phoneE164 = '+20' + phoneLocal.slice(1);
    const source = ALLOWED_SOURCES.includes(String(payload.source)) ? String(payload.source) : 'other';
    const sourceUrl = safeText_(payload.sourceUrl, 500);
    const now = new Date();

    const lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try {
      const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME);
      if (!sheet) throw new Error('SUBSCRIBERS_SHEET_NOT_FOUND');

      const lastRow = sheet.getLastRow();
      let existingRow = 0;
      if (lastRow >= 2) {
        const phones = sheet.getRange(2, 2, lastRow - 1, 1).getDisplayValues();
        for (let i = 0; i < phones.length; i++) {
          if (String(phones[i][0]).trim() === phoneE164) {
            existingRow = i + 2;
            break;
          }
        }
      }

      if (existingRow) {
        const countCell = sheet.getRange(existingRow, 10);
        const currentCount = Number(countCell.getValue()) || 0;
        sheet.getRange(existingRow, 4).setValue(true);
        sheet.getRange(existingRow, 5).setValue(source);
        sheet.getRange(existingRow, 6).setValue(sourceUrl);
        sheet.getRange(existingRow, 7).setValue('ACTIVE');
        sheet.getRange(existingRow, 9).setValue(now);
        countCell.setValue(currentCount + 1);
        return json_({ ok: true, status: 'updated' });
      }

      const subscriberId = createSubscriberId_(phoneE164);
      sheet.appendRow([
        subscriberId,
        phoneE164,
        phoneLocal,
        true,
        source,
        sourceUrl,
        'ACTIVE',
        now,
        now,
        1,
        source === 'popup' ? 'POP UP VIP' : 'OMRAN VIP',
        'تسجيل من نموذج خليك مميز على المتجر'
      ]);

      return json_({ ok: true, status: 'created' });
    } finally {
      lock.releaseLock();
    }
  } catch (error) {
    console.error(error);
    return json_({ ok: false, error: 'SERVER_ERROR' });
  }
}

function doGet() {
  return json_({ ok: true, service: 'omran-subscribers', version: 1 });
}

function readPayload_(e) {
  if (!e) return {};
  if (e.parameter && Object.keys(e.parameter).length) return e.parameter;
  if (e.postData && e.postData.contents) {
    try { return JSON.parse(e.postData.contents); } catch (_) { return {}; }
  }
  return {};
}

function normalizeEgyptianMobile_(value) {
  let digits = String(value || '').replace(/\D/g, '');
  if (digits.indexOf('0020') === 0) digits = digits.slice(4);
  if (digits.indexOf('20') === 0) digits = digits.slice(2);
  if (digits.indexOf('1') === 0 && digits.length === 10) digits = '0' + digits;
  return /^01[0125]\d{8}$/.test(digits) ? digits : null;
}

function createSubscriberId_(phoneE164) {
  const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, phoneE164);
  const hex = digest.map(function(byte) {
    const value = byte < 0 ? byte + 256 : byte;
    return ('0' + value.toString(16)).slice(-2);
  }).join('');
  return 'SUB-' + hex.slice(0, 12).toUpperCase();
}

function safeText_(value, maxLength) {
  return String(value || '').replace(/[\r\n\t]/g, ' ').trim().slice(0, maxLength);
}

function json_(value) {
  return ContentService
    .createTextOutput(JSON.stringify(value))
    .setMimeType(ContentService.MimeType.JSON);
}
