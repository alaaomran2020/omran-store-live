const CONFIG = {
  SPREADSHEET_ID: '1R-6wcwy5KWXY1uznNVCx6MB4vB0JTS3omGinEJA7tCc',
  SUBSCRIBERS_SHEET: 'المشتركون',
  INTAKE_SHEET: 'إدخال المنتجات',
  EMPLOYEES_SHEET: 'الموظفون',
  CATALOG_SHEET: 'كتالوج النشر الآلي',
  TIMEZONE: 'Africa/Cairo',
  ALLOWED_SUBSCRIBER_SOURCES: ['storefront', 'products', 'popup', 'other'],
  INTAKE_TEMPLATE_ROW: 4,
};

/**
 * One Apps Script Web App handles three small jobs:
 * 1) Storefront VIP subscriber upsert (POST without route=telegram)
 * 2) Telegram product-intake webhook (POST ?route=telegram&key=...)
 * 3) Read-only published catalog CSV feed (GET ?action=catalog)
 *
 * Script Properties required:
 * - TELEGRAM_BOT_TOKEN  (secret from BotFather)
 * Optional / auto-created:
 * - TELEGRAM_WEBHOOK_KEY
 * - TELEGRAM_DRIVE_FOLDER_ID
 */

function doGet(e) {
  const action = String((e && e.parameter && e.parameter.action) || '').trim().toLowerCase();
  if (action === 'catalog') return catalogCsv_();
  return json_({ ok: true, service: 'omran-automation', version: 2 });
}

function doPost(e) {
  try {
    const route = String((e && e.parameter && e.parameter.route) || '').trim().toLowerCase();
    if (route === 'telegram') return handleTelegramWebhook_(e);
    return handleSubscriberSignup_(e);
  } catch (error) {
    console.error(error && error.stack ? error.stack : error);
    return json_({ ok: false, error: 'SERVER_ERROR' });
  }
}

// -----------------------------------------------------------------------------
// TELEGRAM PRODUCT INTAKE
// -----------------------------------------------------------------------------

function setupTelegramBot() {
  const token = requiredProperty_('TELEGRAM_BOT_TOKEN');
  const serviceUrl = ScriptApp.getService().getUrl();
  if (!serviceUrl) throw new Error('Deploy this Apps Script as a Web App first.');

  const props = PropertiesService.getScriptProperties();
  let key = props.getProperty('TELEGRAM_WEBHOOK_KEY');
  if (!key) {
    key = Utilities.getUuid().replace(/-/g, '');
    props.setProperty('TELEGRAM_WEBHOOK_KEY', key);
  }

  ensureTelegramDriveFolder_();

  const webhookUrl = serviceUrl + '?route=telegram&key=' + encodeURIComponent(key);
  const response = telegramApi_('setWebhook', {
    url: webhookUrl,
    allowed_updates: JSON.stringify(['message']),
    drop_pending_updates: false,
  });

  console.log(JSON.stringify({ ok: true, webhookUrl: webhookUrl, telegram: response }));
  return response;
}

function getTelegramWebhookInfo() {
  return telegramApi_('getWebhookInfo', {});
}

function deleteTelegramWebhook() {
  return telegramApi_('deleteWebhook', { drop_pending_updates: false });
}

function handleTelegramWebhook_(e) {
  const props = PropertiesService.getScriptProperties();
  const expectedKey = props.getProperty('TELEGRAM_WEBHOOK_KEY') || '';
  const suppliedKey = String((e && e.parameter && e.parameter.key) || '');
  if (!expectedKey || suppliedKey !== expectedKey) return json_({ ok: false, error: 'FORBIDDEN' });

  const update = parseJsonBody_(e);
  if (!update || !update.message) return json_({ ok: true, ignored: true });

  const message = update.message;
  const from = message.from || {};
  const chat = message.chat || {};
  const telegramId = String(from.id || '').trim();
  const chatId = String(chat.id || '').trim();
  if (!telegramId || !chatId) return json_({ ok: true, ignored: true });

  const text = String(message.text || '').trim();
  const command = text.split(/\s+/)[0].toLowerCase();

  if (command === '/start') {
    const access = getEmployeeAccess_(telegramId);
    if (access.authorized) {
      sendTelegramMessage_(chatId, buildWelcomeMessage_(access));
    } else {
      const request = ensureEmployeeAccessRequest_(from);
      sendTelegramMessage_(chatId, request.message);
    }
    return json_({ ok: true });
  }

  const access = getEmployeeAccess_(telegramId);
  if (!access.authorized) {
    const request = ensureEmployeeAccessRequest_(from);
    sendTelegramMessage_(chatId, request.message);
    return json_({ ok: true, access: 'pending' });
  }

  touchEmployeeLogin_(access.row);

  if (command === '/help') {
    sendTelegramMessage_(chatId, buildWelcomeMessage_(access));
    return json_({ ok: true });
  }

  if (command === '/status') {
    sendTelegramMessage_(chatId, '✅ حسابك مفعل\nالدور: ' + access.role + '\nالاسم: ' + access.displayName);
    return json_({ ok: true });
  }

  if (command === '/approve' || command === '/suspend') {
    if (access.role !== 'ADMIN') {
      sendTelegramMessage_(chatId, '⛔ هذا الأمر متاح للمدير فقط.');
      return json_({ ok: true });
    }
    const targetId = String(text.split(/\s+/)[1] || '').trim();
    if (!/^\d+$/.test(targetId)) {
      sendTelegramMessage_(chatId, 'استخدم:\n/approve TELEGRAM_ID\nأو\n/suspend TELEGRAM_ID');
      return json_({ ok: true });
    }
    const result = command === '/approve'
      ? approveEmployee_(targetId, access.displayName)
      : suspendEmployee_(targetId, access.displayName);
    sendTelegramMessage_(chatId, result.message);
    return json_({ ok: true });
  }

  if (!message.photo || !message.photo.length) {
    sendTelegramMessage_(chatId, '📷 ابعت صورة المنتج ومعها البيانات في الـCaption.\n\nمثال:\nاسم: عربية ريموت كبيرة\nالقسم: سيارات وطائرات ريموت\nالسعر: \nالكمية: \nملاحظات: أحمر وأزرق');
    return json_({ ok: true });
  }

  const caption = String(message.caption || '').trim();
  const fields = parseProductCaption_(caption);
  if (!fields.name) {
    sendTelegramMessage_(chatId, '⚠️ الصورة وصلت، لكن لازم تكتب اسم المنتج في الـCaption بالشكل:\nاسم: اسم المنتج\nالقسم: التصنيف');
    return json_({ ok: true, error: 'PRODUCT_NAME_REQUIRED' });
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const photo = message.photo[message.photo.length - 1];
    const fileUniqueId = String(photo.file_unique_id || '').trim();
    const exactDuplicate = findExactTelegramImageDuplicate_(fileUniqueId);
    if (exactDuplicate) {
      sendTelegramMessage_(chatId, '♻️ الصورة دي اتسجلت قبل كده.\nمعرف الإدخال: ' + exactDuplicate.intakeId + '\nلم يتم إنشاء صف مكرر.');
      return json_({ ok: true, duplicate: true, intakeId: exactDuplicate.intakeId });
    }

    const intakeId = createIntakeId_();
    const storedImage = downloadTelegramPhotoToDrive_(photo.file_id, intakeId);
    const possibleDuplicate = hasPossibleNameDuplicate_(fields.name);
    const row = appendTelegramIntake_(message, from, access, fields, storedImage, fileUniqueId, intakeId, possibleDuplicate);

    const reply = [
      '✅ تم استلام المنتج',
      'معرف الإدخال: ' + intakeId,
      'المنتج: ' + fields.name,
      'الحالة: NEEDS_REVIEW',
      possibleDuplicate ? '⚠️ يوجد اسم مشابه — تم وضع POSSIBLE_DUPLICATE للمراجعة.' : 'فحص التكرار: CLEAR',
      'الصف: ' + row,
    ].join('\n');
    sendTelegramMessage_(chatId, reply);
    return json_({ ok: true, intakeId: intakeId, row: row, possibleDuplicate: possibleDuplicate });
  } finally {
    lock.releaseLock();
  }
}

function buildWelcomeMessage_(access) {
  return [
    '🤖 Omran Toys Bot — إدخال المنتجات',
    '',
    'حسابك مفعل: ' + access.displayName,
    'الدور: ' + access.role,
    '',
    'ابعت صورة المنتج ومعها Caption:',
    'اسم: عربية ريموت كبيرة',
    'القسم: سيارات وطائرات ريموت',
    'السعر:',
    'الكمية:',
    'ملاحظات: أحمر وأزرق',
    '',
    'السعر والكمية اختياريان حاليًا.',
    'كل منتج يدخل NEEDS_REVIEW ولا يُنشر إلا بعد الاعتماد.',
  ].join('\n');
}

function parseProductCaption_(caption) {
  const out = {
    name: '', category: '', subcategory: '', brand: '', supplier: '', barcode: '', sku: '',
    purchasePrice: '', salePrice: '', wholesalePrice: '', quantity: '', notes: ''
  };
  const aliases = {
    'اسم': 'name', 'الاسم': 'name', 'المنتج': 'name', 'اسم المنتج': 'name',
    'القسم': 'category', 'التصنيف': 'category',
    'التصنيف الفرعي': 'subcategory', 'فرعي': 'subcategory',
    'العلامة': 'brand', 'البراند': 'brand', 'العلامة التجارية': 'brand',
    'المورد': 'supplier', 'الباركود': 'barcode', 'باركود': 'barcode',
    'sku': 'sku', 'رمز المخزون': 'sku',
    'سعر الشراء': 'purchasePrice', 'شراء': 'purchasePrice',
    'السعر': 'salePrice', 'سعر البيع': 'salePrice',
    'سعر الجملة': 'wholesalePrice', 'الجملة': 'wholesalePrice',
    'الكمية': 'quantity', 'كمية': 'quantity',
    'ملاحظات': 'notes', 'ملاحظة': 'notes',
  };

  String(caption || '').split(/\r?\n/).forEach(function(line) {
    const match = line.match(/^\s*([^:=：]+)\s*[:=：]\s*(.*?)\s*$/);
    if (!match) return;
    const label = normalizeArabicLabel_(match[1]);
    const key = aliases[label] || aliases[label.toLowerCase()];
    if (key) out[key] = safeText_(match[2], 500);
  });

  if (!out.name && caption && caption.indexOf(':') === -1 && caption.indexOf('=') === -1) {
    out.name = safeText_(caption.split(/\r?\n/)[0], 160);
  }
  return out;
}

function appendTelegramIntake_(message, from, access, fields, storedImage, fileUniqueId, intakeId, possibleDuplicate) {
  const sheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheetByName(CONFIG.INTAKE_SHEET);
  if (!sheet) throw new Error('INTAKE_SHEET_NOT_FOUND');

  const row = sheet.getLastRow() + 1;
  const now = new Date();
  const sourceRef = 'telegram:' + String(message.chat.id) + ':' + String(message.message_id) + ':file_unique_id=' + fileUniqueId;
  const priceVerified = Boolean(parsePrice_(fields.salePrice) !== null || parsePrice_(fields.wholesalePrice) !== null || parsePrice_(fields.purchasePrice) !== null);
  const duplicateStatus = possibleDuplicate ? 'POSSIBLE_DUPLICATE' : 'CLEAR';
  const reasonParts = ['TELEGRAM_INTAKE'];
  if (possibleDuplicate) reasonParts.push('POSSIBLE_DUPLICATE_NAME');
  if (fields.quantity) reasonParts.push('QTY=' + fields.quantity);
  if (fields.notes) reasonParts.push('NOTES=' + fields.notes);

  // Preserve the sheet's existing look + validation model for the new row.
  const template = sheet.getRange(CONFIG.INTAKE_TEMPLATE_ROW, 1, 1, 30);
  template.copyFormatToRange(sheet, 1, 30, row, row);
  sheet.getRange(row, 1, 1, 30).setDataValidations(template.getDataValidations());

  const values = [
    intakeId,
    now.toISOString(),
    access.displayName || telegramDisplayName_(from),
    'Telegram',
    sourceRef,
    storedImage.publicUrl,
    fields.barcode,
    fields.sku,
    fields.name,
    fields.category,
    fields.subcategory,
    fields.brand,
    fields.supplier,
    numericOrBlank_(fields.purchasePrice),
    numericOrBlank_(fields.salePrice),
    numericOrBlank_(fields.wholesalePrice),
    priceVerified,
    true,
    false,
    duplicateStatus,
    'RAW',
    'NEEDS_REVIEW',
    'NEEDS_REVIEW',
    reasonParts.join(' — '),
    '',
    '',
  ];
  sheet.getRange(row, 1, 1, 26).setValues([values]);

  sheet.getRange(row, 27).setFormula('=IF(A' + row + '="","",IF(AND(OR(AND(N' + row + '="",O' + row + '="",P' + row + '=""),Q' + row + '=TRUE),R' + row + '=TRUE,S' + row + '=TRUE,T' + row + '="CLEAR",U' + row + '="READY_FOR_QA",V' + row + '="PASS",OR(W' + row + '="APPROVED",W' + row + '="PUBLISHED")),"PASS","BLOCK"))');
  sheet.getRange(row, 28).setFormula('=IF(A' + row + '="","",IF(W' + row + '="PUBLISHED","PUBLISHED",IF(AND(W' + row + '="APPROVED",AA' + row + '="PASS"),"READY","BLOCK")))');

  // Source Drive ID is embedded in the public URL and the image is safely retained in Drive.
  sheet.getRange(row, 6).setNote('Telegram file_unique_id: ' + fileUniqueId + '\nDrive file ID: ' + storedImage.fileId);
  SpreadsheetApp.flush();
  return row;
}

function downloadTelegramPhotoToDrive_(fileId, intakeId) {
  const fileInfo = telegramApi_('getFile', { file_id: fileId });
  if (!fileInfo.ok || !fileInfo.result || !fileInfo.result.file_path) throw new Error('TELEGRAM_FILE_LOOKUP_FAILED');

  const token = requiredProperty_('TELEGRAM_BOT_TOKEN');
  const url = 'https://api.telegram.org/file/bot' + token + '/' + fileInfo.result.file_path;
  const response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
  if (response.getResponseCode() < 200 || response.getResponseCode() >= 300) throw new Error('TELEGRAM_FILE_DOWNLOAD_FAILED');

  const folder = ensureTelegramDriveFolder_();
  const extension = extensionFromTelegramPath_(fileInfo.result.file_path);
  const blob = response.getBlob().setName(intakeId + extension);
  const file = folder.createFile(blob);
  try {
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  } catch (error) {
    console.warn('Could not enable public link sharing for Telegram image: ' + error);
  }

  return {
    fileId: file.getId(),
    publicUrl: 'https://drive.google.com/uc?export=view&id=' + file.getId(),
  };
}

function ensureTelegramDriveFolder_() {
  const props = PropertiesService.getScriptProperties();
  const existingId = props.getProperty('TELEGRAM_DRIVE_FOLDER_ID');
  if (existingId) {
    try { return DriveApp.getFolderById(existingId); } catch (_) {}
  }
  const folder = DriveApp.createFolder('Omran Telegram Product Intake');
  props.setProperty('TELEGRAM_DRIVE_FOLDER_ID', folder.getId());
  return folder;
}

function findExactTelegramImageDuplicate_(fileUniqueId) {
  if (!fileUniqueId) return null;
  const sheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheetByName(CONFIG.INTAKE_SHEET);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return null;
  const finder = sheet.getRange(2, 5, lastRow - 1, 1).createTextFinder('file_unique_id=' + fileUniqueId).matchCase(false).findNext();
  if (!finder) return null;
  return { row: finder.getRow(), intakeId: String(sheet.getRange(finder.getRow(), 1).getDisplayValue()) };
}

function hasPossibleNameDuplicate_(name) {
  const needle = normalizeName_(name);
  if (!needle) return false;
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const intake = ss.getSheetByName(CONFIG.INTAKE_SHEET);
  const intakeLast = intake.getLastRow();
  if (intakeLast >= 2) {
    const names = intake.getRange(2, 9, intakeLast - 1, 1).getDisplayValues();
    for (let i = 0; i < names.length; i++) if (normalizeName_(names[i][0]) === needle) return true;
  }
  const site = ss.getSheetByName('منتجات الموقع');
  if (site) {
    const last = site.getLastRow();
    if (last >= 2) {
      const names = site.getRange(2, 2, last - 1, 1).getDisplayValues();
      for (let i = 0; i < names.length; i++) if (normalizeName_(names[i][0]) === needle) return true;
    }
  }
  return false;
}

// -----------------------------------------------------------------------------
// EMPLOYEE ACCESS CONTROL
// -----------------------------------------------------------------------------

function getEmployeeAccess_(telegramId) {
  const sheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheetByName(CONFIG.EMPLOYEES_SHEET);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return { authorized: false, found: false };
  const ids = sheet.getRange(2, 8, lastRow - 1, 1).getDisplayValues();
  for (let i = 0; i < ids.length; i++) {
    if (String(ids[i][0]).trim() !== telegramId) continue;
    const row = i + 2;
    const role = String(sheet.getRange(row, 6).getDisplayValue()).trim() || 'EMPLOYEE';
    const approval = String(sheet.getRange(row, 7).getDisplayValue()).trim();
    const active = sheet.getRange(row, 13).getValue() === true;
    const displayName = String(sheet.getRange(row, 3).getDisplayValue()).trim() || telegramId;
    return { authorized: approval === 'APPROVED' && active, found: true, row: row, role: role, approval: approval, active: active, displayName: displayName };
  }
  return { authorized: false, found: false };
}

function ensureEmployeeAccessRequest_(from) {
  const telegramId = String(from.id || '').trim();
  const existing = getEmployeeAccess_(telegramId);
  if (existing.found) {
    if (existing.approval === 'PENDING') return { message: '⏳ طلب دخولك موجود بالفعل وفي انتظار موافقة المدير.\nTelegram ID: ' + telegramId };
    if (existing.approval === 'SUSPENDED') return { message: '⛔ حسابك موقوف حاليًا. راجع المدير.\nTelegram ID: ' + telegramId };
    return { message: '⛔ حسابك غير مفعل. راجع المدير.\nTelegram ID: ' + telegramId };
  }

  const sheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheetByName(CONFIG.EMPLOYEES_SHEET);
  const now = new Date().toISOString();
  const row = sheet.getLastRow() + 1;
  if (row > 2) {
    const template = sheet.getRange(2, 1, 1, 16);
    template.copyFormatToRange(sheet, 1, 16, row, row);
    sheet.getRange(row, 1, 1, 16).setDataValidations(template.getDataValidations());
  }
  sheet.getRange(row, 1, 1, 16).setValues([[
    'TG-' + telegramId,
    String(from.username || ''),
    telegramDisplayName_(from),
    '',
    '',
    'EMPLOYEE',
    'PENDING',
    telegramId,
    now,
    '',
    '',
    '',
    false,
    'طلب دخول تلقائي من Omran Toys Bot',
    now,
    now,
  ]]);
  return { message: '📝 تم تسجيل طلب دخولك.\nTelegram ID: ' + telegramId + '\nالحالة: PENDING\nبعد موافقة المدير ابعت /start مرة تانية.' };
}

function approveEmployee_(telegramId, approvedBy) {
  const access = getEmployeeAccess_(telegramId);
  if (!access.found) return { message: 'لم أجد طلبًا بهذا Telegram ID.' };
  const sheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheetByName(CONFIG.EMPLOYEES_SHEET);
  const now = new Date().toISOString();
  sheet.getRange(access.row, 7).setValue('APPROVED');
  sheet.getRange(access.row, 10).setValue(now);
  sheet.getRange(access.row, 11).setValue(approvedBy);
  sheet.getRange(access.row, 13).setValue(true);
  sheet.getRange(access.row, 16).setValue(now);
  return { message: '✅ تم اعتماد Telegram ID: ' + telegramId };
}

function suspendEmployee_(telegramId, approvedBy) {
  const access = getEmployeeAccess_(telegramId);
  if (!access.found) return { message: 'لم أجد موظفًا بهذا Telegram ID.' };
  const sheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheetByName(CONFIG.EMPLOYEES_SHEET);
  const now = new Date().toISOString();
  sheet.getRange(access.row, 7).setValue('SUSPENDED');
  sheet.getRange(access.row, 11).setValue(approvedBy);
  sheet.getRange(access.row, 13).setValue(false);
  sheet.getRange(access.row, 16).setValue(now);
  return { message: '⛔ تم إيقاف Telegram ID: ' + telegramId };
}

function touchEmployeeLogin_(row) {
  if (!row) return;
  const sheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheetByName(CONFIG.EMPLOYEES_SHEET);
  sheet.getRange(row, 12).setValue(new Date().toISOString());
  sheet.getRange(row, 16).setValue(new Date().toISOString());
}

// -----------------------------------------------------------------------------
// LIVE PUBLISHED CATALOG FEED
// -----------------------------------------------------------------------------

function catalogCsv_() {
  const sheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheetByName(CONFIG.CATALOG_SHEET);
  if (!sheet) throw new Error('CATALOG_SHEET_NOT_FOUND');
  const rows = sheet.getRange(1, 1, Math.max(1, sheet.getLastRow()), 15).getDisplayValues();
  const nonBlank = rows.filter(function(row, index) { return index === 0 || String(row[0] || '').trim() !== ''; });
  const csv = nonBlank.map(function(row) { return row.map(csvEscape_).join(','); }).join('\r\n');
  return ContentService.createTextOutput(csv).setMimeType(ContentService.MimeType.CSV);
}

// -----------------------------------------------------------------------------
// EXISTING VIP SUBSCRIBER FLOW (kept compatible)
// -----------------------------------------------------------------------------

function handleSubscriberSignup_(e) {
  const payload = readPayload_(e);
  if (String(payload.website || '').trim()) return json_({ ok: true, ignored: true });

  const phoneLocal = normalizeEgyptianMobile_(payload.phone || '');
  if (!phoneLocal) return json_({ ok: false, error: 'INVALID_PHONE' });
  if (String(payload.consent) !== 'true') return json_({ ok: false, error: 'CONSENT_REQUIRED' });

  const phoneE164 = '+20' + phoneLocal.slice(1);
  const source = CONFIG.ALLOWED_SUBSCRIBER_SOURCES.includes(String(payload.source)) ? String(payload.source) : 'other';
  const sourceUrl = safeText_(payload.sourceUrl, 500);
  const now = new Date();

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheetByName(CONFIG.SUBSCRIBERS_SHEET);
    if (!sheet) throw new Error('SUBSCRIBERS_SHEET_NOT_FOUND');
    const lastRow = sheet.getLastRow();
    let existingRow = 0;
    if (lastRow >= 2) {
      const phones = sheet.getRange(2, 2, lastRow - 1, 1).getDisplayValues();
      for (let i = 0; i < phones.length; i++) {
        if (String(phones[i][0]).trim() === phoneE164) { existingRow = i + 2; break; }
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
    sheet.appendRow([subscriberId, phoneE164, phoneLocal, true, source, sourceUrl, 'ACTIVE', now, now, 1, source === 'popup' ? 'POP UP VIP' : 'OMRAN VIP', 'تسجيل من نموذج خليك مميز على المتجر']);
    return json_({ ok: true, status: 'created' });
  } finally {
    lock.releaseLock();
  }
}

// -----------------------------------------------------------------------------
// HELPERS
// -----------------------------------------------------------------------------

function telegramApi_(method, payload) {
  const token = requiredProperty_('TELEGRAM_BOT_TOKEN');
  const response = UrlFetchApp.fetch('https://api.telegram.org/bot' + token + '/' + method, {
    method: 'post',
    payload: payload || {},
    muteHttpExceptions: true,
  });
  const text = response.getContentText();
  let json;
  try { json = JSON.parse(text); } catch (_) { json = { ok: false, description: text }; }
  if (response.getResponseCode() < 200 || response.getResponseCode() >= 300 || json.ok === false) {
    console.error('Telegram API ' + method + ' failed: ' + text);
  }
  return json;
}

function sendTelegramMessage_(chatId, text) {
  return telegramApi_('sendMessage', { chat_id: chatId, text: text, disable_web_page_preview: true });
}

function requiredProperty_(name) {
  const value = PropertiesService.getScriptProperties().getProperty(name);
  if (!value) throw new Error('MISSING_SCRIPT_PROPERTY_' + name);
  return value;
}

function parseJsonBody_(e) {
  if (!e || !e.postData || !e.postData.contents) return {};
  try { return JSON.parse(e.postData.contents); } catch (_) { return {}; }
}

function readPayload_(e) {
  if (!e) return {};
  if (e.parameter && Object.keys(e.parameter).length) return e.parameter;
  return parseJsonBody_(e);
}

function normalizeEgyptianMobile_(value) {
  const arabicDigits = { '٠':'0','١':'1','٢':'2','٣':'3','٤':'4','٥':'5','٦':'6','٧':'7','٨':'8','٩':'9' };
  let digits = String(value || '').replace(/[٠-٩]/g, function(d) { return arabicDigits[d] || d; }).replace(/\D/g, '');
  if (digits.indexOf('0020') === 0) digits = digits.slice(4);
  if (digits.indexOf('20') === 0) digits = digits.slice(2);
  if (digits.indexOf('1') === 0 && digits.length === 10) digits = '0' + digits;
  return /^01[0125]\d{8}$/.test(digits) ? digits : null;
}

function createSubscriberId_(phoneE164) {
  const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, phoneE164);
  const hex = digest.map(function(byte) { const value = byte < 0 ? byte + 256 : byte; return ('0' + value.toString(16)).slice(-2); }).join('');
  return 'SUB-' + hex.slice(0, 12).toUpperCase();
}

function createIntakeId_() {
  const stamp = Utilities.formatDate(new Date(), CONFIG.TIMEZONE, 'yyyyMMdd-HHmmss');
  return 'INT-TG-' + stamp + '-' + Utilities.getUuid().replace(/-/g, '').slice(0, 6).toUpperCase();
}

function telegramDisplayName_(from) {
  return safeText_([from.first_name || '', from.last_name || ''].join(' ').trim() || from.username || String(from.id || ''), 120);
}

function normalizeArabicLabel_(value) {
  return String(value || '').trim().replace(/\s+/g, ' ').toLowerCase();
}

function normalizeName_(value) {
  return String(value || '').toLowerCase().replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').replace(/[^\p{L}\p{N}]+/gu, ' ').trim().replace(/\s+/g, ' ');
}

function parsePrice_(value) {
  const cleaned = String(value || '').replace(/,/g, '').replace(/[^0-9.]/g, '');
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

function numericOrBlank_(value) {
  const n = parsePrice_(value);
  return n === null ? '' : n;
}

function extensionFromTelegramPath_(path) {
  const match = String(path || '').match(/(\.[a-zA-Z0-9]{2,5})$/);
  return match ? match[1].toLowerCase() : '.jpg';
}

function safeText_(value, maxLength) {
  return String(value || '').replace(/[\r\n\t]/g, ' ').trim().slice(0, maxLength);
}

function csvEscape_(value) {
  const text = String(value == null ? '' : value);
  return /[",\r\n]/.test(text) ? '"' + text.replace(/"/g, '""') + '"' : text;
}

function json_(value) {
  return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON);
}
