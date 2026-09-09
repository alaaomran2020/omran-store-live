/**
 * Omran VIP pilot operations.
 *
 * Safety defaults:
 * - financial_activation and public_verification_enabled must be explicitly enabled.
 * - no card type, offer or partner is seeded as active.
 * - verification tokens are returned once and only their SHA-256 hashes are stored.
 * - every mutation uses a document lock and appends to the existing audit sheet.
 */

const VIP_ALLOWED_ROLES = {
  ISSUE_CARD: ['ADMIN', 'CARD_ISSUER'],
  ACTIVATE_CARD: ['ADMIN', 'CARD_ISSUER'],
  SEARCH_CARD: ['ADMIN', 'CARD_ISSUER', 'BRANCH_STAFF', 'SUPPORT', 'REVIEWER'],
  RECORD_REDEMPTION: ['ADMIN', 'BRANCH_STAFF'],
  SUSPEND_CARD: ['ADMIN', 'SUPPORT'],
  REPLACE_CARD: ['ADMIN', 'CARD_ISSUER'],
  RECORD_COMPLAINT: ['ADMIN', 'BRANCH_STAFF', 'SUPPORT'],
  MANAGE_STAFF: ['ADMIN'],
};

function vipNormalizeText_(value) {
  return String(value == null ? '' : value).trim();
}

function vipRows_(sheetName) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  if (!sheet) throw new Error('MISSING_SHEET: ' + sheetName);
  const values = sheet.getDataRange().getValues();
  if (!values.length) throw new Error('MISSING_HEADERS: ' + sheetName);
  const headers = values[0].map(vipNormalizeText_);
  return {
    sheet: sheet,
    headers: headers,
    rows: values.slice(1).map(function(row, index) {
      const item = { __row: index + 2 };
      headers.forEach(function(header, column) { item[header] = row[column]; });
      return item;
    }),
  };
}

function vipAppend_(sheetName, record) {
  const table = vipRows_(sheetName);
  const unknown = Object.keys(record).filter(function(key) { return table.headers.indexOf(key) === -1; });
  if (unknown.length) throw new Error('UNKNOWN_COLUMNS: ' + sheetName + ': ' + unknown.join(','));
  table.sheet.appendRow(table.headers.map(function(header) {
    return Object.prototype.hasOwnProperty.call(record, header) ? record[header] : '';
  }));
}

function vipUpdateRow_(sheetName, rowNumber, patch) {
  const table = vipRows_(sheetName);
  Object.keys(patch).forEach(function(header) {
    const column = table.headers.indexOf(header);
    if (column === -1) throw new Error('UNKNOWN_COLUMN: ' + sheetName + ': ' + header);
    table.sheet.getRange(rowNumber, column + 1).setValue(patch[header]);
  });
}

function vipFindOne_(sheetName, header, value) {
  const target = vipNormalizeText_(value);
  return vipRows_(sheetName).rows.find(function(row) {
    return vipNormalizeText_(row[header]) === target;
  }) || null;
}

function vipSetting_(key) {
  const row = vipFindOne_('VIP_Program_Settings', 'setting_key', key);
  return row && vipNormalizeText_(row.status) === 'APPROVED' ? vipNormalizeText_(row.setting_value) : '';
}

function vipRequireEnabled_(key) {
  if (vipSetting_(key).toLowerCase() !== 'true') throw new Error('FEATURE_DISABLED: ' + key);
}

function vipActor_() {
  const email = vipNormalizeText_(Session.getActiveUser().getEmail()).toLowerCase();
  if (!email) throw new Error('VERIFIED_GOOGLE_IDENTITY_REQUIRED');
  const staff = vipRows_(VIP_EXISTING_DEPENDENCIES.staff).rows.find(function(row) {
    return vipNormalizeText_(row['اسم المستخدم']).toLowerCase() === email &&
      vipNormalizeText_(row['حالة الموافقة']) === 'APPROVED' && row['نشط'] === true;
  });
  if (!staff) throw new Error('STAFF_NOT_AUTHORIZED');
  return { identity: email, role: vipNormalizeText_(staff['الدور']) };
}

function vipAuthorize_(action) {
  const actor = vipActor_();
  if ((VIP_ALLOWED_ROLES[action] || []).indexOf(actor.role) === -1) throw new Error('ROLE_NOT_ALLOWED: ' + action);
  return actor;
}

function vipId_(prefix) {
  return prefix + '-' + Utilities.getUuid().replace(/-/g, '').slice(0, 20).toUpperCase();
}

function vipToken_() {
  return Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '');
}

function vipSha256_(value) {
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(value), Utilities.Charset.UTF_8)
    .map(function(byte) { return ('0' + ((byte + 256) % 256).toString(16)).slice(-2); })
    .join('');
}

function vipNormalizeEgyptPhone_(value) {
  let digits = vipNormalizeText_(value).replace(/\D/g, '');
  if (digits.slice(0, 2) === '20') digits = digits.slice(2);
  if (digits.slice(0, 1) === '0') digits = digits.slice(1);
  if (!/^1(?:0|1|2|5)\d{8}$/.test(digits)) throw new Error('INVALID_EGYPTIAN_MOBILE');
  return '+20' + digits;
}

function vipMaskPhone_(value) {
  const phone = vipNormalizeText_(value);
  return phone.length < 7 ? '' : phone.slice(0, 4) + '•••••' + phone.slice(-3);
}

function vipAudit_(actor, action, entityType, entityId, field, oldValue, newValue, note) {
  vipAppend_(VIP_EXISTING_DEPENDENCIES.audit, {
    'معرف الحدث': vipId_('VIP-AUD'),
    'التوقيت': new Date().toISOString(),
    'الإجراء': action,
    'نوع الكيان': entityType,
    'معرف الكيان': entityId,
    'الحقل': field || '',
    'القيمة القديمة': oldValue == null ? '' : String(oldValue),
    'القيمة الجديدة': newValue == null ? '' : String(newValue),
    'المنفذ': actor.identity,
    'ملاحظات': note || '',
  });
}

function vipWithLock_(callback) {
  const lock = LockService.getDocumentLock();
  lock.waitLock(15000);
  try { return callback(); } finally { lock.releaseLock(); }
}

function issueVipCard(input) {
  return vipWithLock_(function() {
    const actor = vipAuthorize_('ISSUE_CARD');
    const subscriberId = vipNormalizeText_(input && input.subscriberId);
    const cardTypeId = vipNormalizeText_(input && input.cardTypeId);
    if (!subscriberId || !cardTypeId) throw new Error('SUBSCRIBER_AND_CARD_TYPE_REQUIRED');
    if (!vipFindOne_(VIP_EXISTING_DEPENDENCIES.customers, 'معرف المشترك', subscriberId)) throw new Error('SUBSCRIBER_NOT_FOUND');
    const cardType = vipFindOne_('VIP_Card_Types', 'card_type_id', cardTypeId);
    if (!cardType || ['APPROVED', 'ACTIVE'].indexOf(vipNormalizeText_(cardType.status)) === -1) throw new Error('CARD_TYPE_NOT_APPROVED');

    const membershipId = vipId_('VIP-MEM');
    const cardId = vipId_('VIP-CARD');
    const serial = 'OV-' + Utilities.getUuid().replace(/-/g, '').slice(0, 12).toUpperCase();
    const token = vipToken_();
    const now = new Date().toISOString();
    if (vipFindOne_('VIP_Cards', 'serial_number', serial)) throw new Error('DUPLICATE_SERIAL');

    vipAppend_('VIP_Memberships', {
      membership_id: membershipId, subscriber_id: subscriberId, program_code: 'OMRAN_VIP',
      status: 'NEW', created_at: now, updated_at: now,
    });
    vipAppend_('VIP_Cards', {
      card_id: cardId, membership_id: membershipId, card_type_id: cardTypeId,
      serial_number: serial, verification_token_hash: vipSha256_(token), status: 'NEW',
      issued_at: now, created_by: actor.identity, updated_at: now,
    });
    vipAudit_(actor, 'VIP_CARD_ISSUED', 'VIP_CARD', cardId, 'status', '', 'NEW', 'Token returned once; only its hash is stored.');
    return { cardId: cardId, membershipId: membershipId, serialNumber: serial, verificationToken: token };
  });
}

function activateVipCard(input) {
  return vipWithLock_(function() {
    const actor = vipAuthorize_('ACTIVATE_CARD');
    vipRequireEnabled_('financial_activation');
    const card = vipFindOne_('VIP_Cards', 'card_id', input && input.cardId);
    const paymentReference = vipNormalizeText_(input && input.paymentReference);
    if (!card) throw new Error('CARD_NOT_FOUND');
    if (vipNormalizeText_(card.status) !== 'NEW') throw new Error('CARD_NOT_NEW');
    if (!paymentReference) throw new Error('PAYMENT_REFERENCE_REQUIRED');
    const cardType = vipFindOne_('VIP_Card_Types', 'card_type_id', card.card_type_id);
    if (!cardType || vipNormalizeText_(cardType.status) !== 'ACTIVE') throw new Error('CARD_TYPE_NOT_ACTIVE');
    const validityDays = Number(cardType.validity_days);
    if (!Number.isInteger(validityDays) || validityDays < 1) throw new Error('INVALID_VALIDITY_DAYS');
    const now = new Date();
    const expires = new Date(now.getTime() + validityDays * 86400000);
    vipUpdateRow_('VIP_Cards', card.__row, {
      status: 'ACTIVE', payment_reference: paymentReference, activated_at: now.toISOString(),
      expires_at: expires.toISOString(), updated_at: now.toISOString(),
    });
    vipUpdateRow_('VIP_Memberships', vipFindOne_('VIP_Memberships', 'membership_id', card.membership_id).__row, {
      status: 'ACTIVE', started_at: now.toISOString(), ends_at: expires.toISOString(), updated_at: now.toISOString(),
    });
    vipAudit_(actor, 'VIP_CARD_ACTIVATED', 'VIP_CARD', card.card_id, 'status', 'NEW', 'ACTIVE', 'Payment reference recorded.');
    return { cardId: card.card_id, status: 'ACTIVE', expiresAt: expires.toISOString() };
  });
}

function verifyVipCard(token) {
  vipRequireEnabled_('public_verification_enabled');
  const hash = vipSha256_(vipNormalizeText_(token));
  const card = vipFindOne_('VIP_Cards', 'verification_token_hash', hash);
  if (!card) return { valid: false, code: 'CARD_NOT_FOUND' };
  const expiry = Date.parse(card.expires_at);
  const status = vipNormalizeText_(card.status);
  const effectiveStatus = status === 'ACTIVE' && Number.isFinite(expiry) && expiry <= Date.now() ? 'EXPIRED' : status;
  const type = vipFindOne_('VIP_Card_Types', 'card_type_id', card.card_type_id);
  return {
    valid: effectiveStatus === 'ACTIVE', serialSuffix: vipNormalizeText_(card.serial_number).slice(-4),
    cardType: type ? vipNormalizeText_(type.display_name_ar) : '', status: effectiveStatus,
    expiresAt: card.expires_at || '',
  };
}

function recordVipRedemption(input) {
  return vipWithLock_(function() {
    const actor = vipAuthorize_('RECORD_REDEMPTION');
    vipRequireEnabled_('financial_activation');
    const idempotencyKey = vipNormalizeText_(input && input.idempotencyKey);
    if (!idempotencyKey) throw new Error('IDEMPOTENCY_KEY_REQUIRED');
    const existing = vipFindOne_('VIP_Redemptions', 'idempotency_key', idempotencyKey);
    if (existing) return { duplicate: true, redemptionId: existing.redemption_id, discountPiasters: Number(existing.discount_piasters) };

    const card = vipFindOne_('VIP_Cards', 'card_id', input.cardId);
    const offer = vipFindOne_('VIP_Offers', 'offer_id', input.offerId);
    const invoice = Number(input.invoicePiasters);
    if (!card || vipNormalizeText_(card.status) !== 'ACTIVE' || Date.parse(card.expires_at) <= Date.now()) throw new Error('CARD_NOT_ACTIVE');
    if (!offer || vipNormalizeText_(offer.status) !== 'ACTIVE') throw new Error('OFFER_NOT_ACTIVE');
    if (!Number.isInteger(invoice) || invoice < Number(offer.minimum_invoice_piasters || 0)) throw new Error('MINIMUM_INVOICE_NOT_MET');
    const now = Date.now();
    if (now < Date.parse(offer.starts_at) || now > Date.parse(offer.ends_at)) throw new Error('OUTSIDE_OFFER_PERIOD');

    const redemptions = vipRows_('VIP_Redemptions').rows.filter(function(row) {
      return vipNormalizeText_(row.card_id) === vipNormalizeText_(card.card_id) &&
        vipNormalizeText_(row.offer_id) === vipNormalizeText_(offer.offer_id) &&
        vipNormalizeText_(row.status) === 'COMPLETED';
    });
    if (redemptions.length >= Number(offer.usage_limit_per_card)) throw new Error('USAGE_LIMIT_REACHED');
    const kind = vipNormalizeText_(offer.discount_kind);
    const raw = kind === 'FIXED' ? Number(offer.discount_value) : Math.floor(invoice * Number(offer.discount_value) / 10000);
    const discount = Math.min(raw, Number(offer.maximum_discount_piasters), invoice);
    if (!Number.isInteger(discount) || discount <= 0) throw new Error('INVALID_DISCOUNT');
    const consumed = vipRows_('VIP_Redemptions').rows.reduce(function(total, row) {
      return total + (vipNormalizeText_(row.offer_id) === vipNormalizeText_(offer.offer_id) && vipNormalizeText_(row.status) === 'COMPLETED' ? Number(row.discount_piasters || 0) : 0);
    }, 0);
    if (offer.total_budget_piasters !== '' && consumed + discount > Number(offer.total_budget_piasters)) throw new Error('OFFER_BUDGET_EXCEEDED');

    const redemptionId = vipId_('VIP-RED');
    vipAppend_('VIP_Redemptions', {
      redemption_id: redemptionId, idempotency_key: idempotencyKey, card_id: card.card_id,
      offer_id: offer.offer_id, partner_branch_id: input.partnerBranchId || '', purchase_id: input.purchaseId || '',
      invoice_piasters: invoice, discount_piasters: discount, payable_piasters: invoice - discount,
      funding_owner: offer.funding_owner, status: 'COMPLETED', occurred_at: new Date().toISOString(), recorded_by: actor.identity,
    });
    vipAudit_(actor, 'VIP_REDEMPTION_COMPLETED', 'VIP_REDEMPTION', redemptionId, 'discount_piasters', '', discount, idempotencyKey);
    return { duplicate: false, redemptionId: redemptionId, discountPiasters: discount, payablePiasters: invoice - discount };
  });
}

function searchVipCards(query) {
  const actor = vipAuthorize_('SEARCH_CARD');
  const needle = vipNormalizeText_(query).toLowerCase();
  if (needle.length < 4) throw new Error('SEARCH_QUERY_TOO_SHORT');
  const cards = vipRows_('VIP_Cards').rows;
  const memberships = vipRows_('VIP_Memberships').rows;
  const subscribers = vipRows_(VIP_EXISTING_DEPENDENCIES.customers).rows;
  return cards.map(function(card) {
    const membership = memberships.find(function(item) { return vipNormalizeText_(item.membership_id) === vipNormalizeText_(card.membership_id); });
    const subscriber = membership ? subscribers.find(function(item) { return vipNormalizeText_(item['معرف المشترك']) === vipNormalizeText_(membership.subscriber_id); }) : null;
    const phone = subscriber ? vipNormalizeText_(subscriber['رقم الهاتف E.164']) : '';
    const haystack = [card.card_id, card.serial_number, membership && membership.membership_id, phone].map(vipNormalizeText_).join('|').toLowerCase();
    return { card: card, membership: membership, phone: phone, match: haystack.indexOf(needle) !== -1 };
  }).filter(function(item) { return item.match; }).slice(0, 20).map(function(item) {
    const maySeePhone = ['ADMIN', 'CARD_ISSUER', 'SUPPORT'].indexOf(actor.role) !== -1;
    return {
      cardId: item.card.card_id, serialNumber: item.card.serial_number, cardTypeId: item.card.card_type_id,
      membershipId: item.card.membership_id, status: item.card.status, activatedAt: item.card.activated_at || '',
      expiresAt: item.card.expires_at || '', phone: maySeePhone ? item.phone : vipMaskPhone_(item.phone),
    };
  });
}

function suspendVipCard(input) {
  return vipWithLock_(function() {
    const actor = vipAuthorize_('SUSPEND_CARD');
    const card = vipFindOne_('VIP_Cards', 'card_id', input && input.cardId);
    const reason = vipNormalizeText_(input && input.reason);
    if (!card) throw new Error('CARD_NOT_FOUND');
    if (['NEW', 'ACTIVE'].indexOf(vipNormalizeText_(card.status)) === -1) throw new Error('CARD_CANNOT_BE_SUSPENDED');
    if (reason.length < 5) throw new Error('SUSPENSION_REASON_REQUIRED');
    vipUpdateRow_('VIP_Cards', card.__row, { status: 'SUSPENDED', updated_at: new Date().toISOString() });
    vipAudit_(actor, 'VIP_CARD_SUSPENDED', 'VIP_CARD', card.card_id, 'status', card.status, 'SUSPENDED', reason);
    return { cardId: card.card_id, status: 'SUSPENDED' };
  });
}

function replaceVipCard(input) {
  return vipWithLock_(function() {
    const actor = vipAuthorize_('REPLACE_CARD');
    const oldCard = vipFindOne_('VIP_Cards', 'card_id', input && input.cardId);
    const reason = vipNormalizeText_(input && input.reason);
    if (!oldCard) throw new Error('CARD_NOT_FOUND');
    if (['LOST', 'SUSPENDED'].indexOf(vipNormalizeText_(oldCard.status)) === -1) throw new Error('SUSPEND_OR_MARK_LOST_BEFORE_REPLACEMENT');
    if (reason.length < 5) throw new Error('REPLACEMENT_REASON_REQUIRED');
    if (vipFindOne_('VIP_Card_Replacements', 'old_card_id', oldCard.card_id)) throw new Error('CARD_ALREADY_REPLACED');

    const token = vipToken_();
    const now = new Date().toISOString();
    const newCardId = vipId_('VIP-CARD');
    const serial = 'OV-' + Utilities.getUuid().replace(/-/g, '').slice(0, 12).toUpperCase();
    const remainsValid = oldCard.expires_at && Date.parse(oldCard.expires_at) > Date.now() && oldCard.activated_at;
    vipAppend_('VIP_Cards', {
      card_id: newCardId, membership_id: oldCard.membership_id, card_type_id: oldCard.card_type_id,
      serial_number: serial, verification_token_hash: vipSha256_(token), status: remainsValid ? 'ACTIVE' : 'NEW',
      payment_reference: oldCard.payment_reference || '', issued_at: now, activated_at: remainsValid ? oldCard.activated_at : '',
      expires_at: remainsValid ? oldCard.expires_at : '', created_by: actor.identity, updated_at: now,
    });
    vipUpdateRow_('VIP_Cards', oldCard.__row, { status: 'REPLACED', replaced_by_card_id: newCardId, updated_at: now });
    const replacementId = vipId_('VIP-REP');
    vipAppend_('VIP_Card_Replacements', {
      replacement_id: replacementId, old_card_id: oldCard.card_id, new_card_id: newCardId,
      reason: reason, fee_piasters: Number(input.feePiasters || 0), approved_by: actor.identity, created_at: now,
    });
    vipAudit_(actor, 'VIP_CARD_REPLACED', 'VIP_CARD', oldCard.card_id, 'status', oldCard.status, 'REPLACED', reason);
    return { oldCardId: oldCard.card_id, newCardId: newCardId, serialNumber: serial, verificationToken: token, status: remainsValid ? 'ACTIVE' : 'NEW' };
  });
}

function createVipComplaint(input) {
  return vipWithLock_(function() {
    const actor = vipAuthorize_('RECORD_COMPLAINT');
    const contact = vipNormalizeEgyptPhone_(input && input.contactPhone);
    const note = vipNormalizeText_(input && input.note);
    if (note.length < 5) throw new Error('COMPLAINT_NOTE_REQUIRED');
    const complaintId = vipId_('VIP-CMP');
    const ticket = 'OVC-' + Utilities.formatDate(new Date(), 'Africa/Cairo', 'yyyyMMdd') + '-' + Utilities.getUuid().slice(0, 6).toUpperCase();
    const now = new Date().toISOString();
    vipAppend_('VIP_Complaints', {
      complaint_id: complaintId, ticket_number: ticket, subscriber_id: input.subscriberId || '',
      card_id: input.cardId || '', partner_id: input.partnerId || '', redemption_id: input.redemptionId || '',
      contact_phone: contact, visited_at: input.visitedAt || '', invoice_piasters: Number(input.invoicePiasters || 0),
      expected_discount_piasters: Number(input.expectedDiscountPiasters || 0), applied_discount_piasters: Number(input.appliedDiscountPiasters || 0),
      receipt_evidence_ref: input.receiptEvidenceRef || '', status: 'NEW', assigned_to: '', created_at: now,
      resolution_note: note, escalation_level: 'NOTICE',
    });
    vipAudit_(actor, 'VIP_COMPLAINT_CREATED', 'VIP_COMPLAINT', complaintId, 'status', '', 'NEW', ticket);
    return { complaintId: complaintId, ticketNumber: ticket, status: 'NEW' };
  });
}

function registerVipStaffEnrollment(input) {
  return vipWithLock_(function() {
    const actor = vipAuthorize_('MANAGE_STAFF');
    const requestCode = vipNormalizeText_(input && input.requestCode).toUpperCase();
    const displayName = vipNormalizeText_(input && input.displayName);
    const email = vipNormalizeText_(input && input.identityEmail).toLowerCase();
    const role = vipNormalizeText_(input && input.requestedRole);
    const phone = vipNormalizeEgyptPhone_(input && input.phone);
    const whatsapp = vipNormalizeEgyptPhone_((input && input.whatsapp) || phone);
    if (!/^OVS-[A-Z0-9]{8}$/.test(requestCode)) throw new Error('INVALID_REQUEST_CODE');
    if (displayName.length < 3 || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error('NAME_AND_IDENTITY_EMAIL_REQUIRED');
    if (['CARD_ISSUER', 'BRANCH_STAFF', 'PARTNER_MANAGER', 'SUPPORT', 'REVIEWER'].indexOf(role) === -1) throw new Error('INVALID_REQUESTED_ROLE');
    if (vipFindOne_('VIP_Staff_Enrollments', 'request_code', requestCode)) throw new Error('DUPLICATE_REQUEST_CODE');
    const enrollmentId = vipId_('VIP-ENR');
    const now = new Date().toISOString();
    vipAppend_('VIP_Staff_Enrollments', {
      enrollment_id: enrollmentId, request_code: requestCode, display_name: displayName,
      phone_e164: phone, whatsapp_e164: whatsapp, identity_email: email, requested_role: role,
      status: 'WHATSAPP_CONFIRMED', requested_at: input.requestedAt || now, whatsapp_verified_at: now,
    });
    vipAudit_(actor, 'VIP_STAFF_WHATSAPP_CONFIRMED', 'VIP_STAFF_ENROLLMENT', enrollmentId, 'status', 'PENDING', 'WHATSAPP_CONFIRMED', requestCode);
    return { enrollmentId: enrollmentId, requestCode: requestCode, status: 'WHATSAPP_CONFIRMED' };
  });
}

function approveVipStaffEnrollment(input) {
  return vipWithLock_(function() {
    const actor = vipAuthorize_('MANAGE_STAFF');
    const enrollment = vipFindOne_('VIP_Staff_Enrollments', 'enrollment_id', input && input.enrollmentId);
    if (!enrollment || vipNormalizeText_(enrollment.status) !== 'WHATSAPP_CONFIRMED') throw new Error('ENROLLMENT_NOT_READY');
    if (vipFindOne_(VIP_EXISTING_DEPENDENCIES.staff, 'اسم المستخدم', enrollment.identity_email)) throw new Error('STAFF_IDENTITY_ALREADY_EXISTS');
    const now = new Date().toISOString();
    const staffId = vipId_('VIP-STAFF');
    vipAppend_(VIP_EXISTING_DEPENDENCIES.staff, {
      'معرف الموظف': staffId, 'اسم المستخدم': enrollment.identity_email, 'الاسم المعروض': enrollment.display_name,
      'الهاتف': enrollment.phone_e164, 'واتساب': enrollment.whatsapp_e164, 'الدور': enrollment.requested_role,
      'حالة الموافقة': 'APPROVED', 'معرف الدخول': enrollment.identity_email, 'وقت الطلب': enrollment.requested_at,
      'وقت الموافقة': now, 'وافق بواسطة': actor.identity, 'نشط': true,
      'ملاحظات': 'WhatsApp sender checked manually. Cloudflare Access allow-list remains a separate required step.',
      'تاريخ الإنشاء': now, 'تاريخ التحديث': now,
    });
    vipUpdateRow_('VIP_Staff_Enrollments', enrollment.__row, { status: 'APPROVED', approved_by: actor.identity, approved_at: now });
    vipAudit_(actor, 'VIP_STAFF_APPROVED', 'STAFF', staffId, 'status', 'WHATSAPP_CONFIRMED', 'APPROVED', enrollment.request_code);
    return { staffId: staffId, email: enrollment.identity_email, role: enrollment.requested_role, accessPolicyPending: true };
  });
}

function getVipStaffConsoleBootstrap() {
  const actor = vipAuthorize_('SEARCH_CARD');
  const cardTypes = vipRows_('VIP_Card_Types').rows.map(function(row) {
    return { id: row.card_type_id, code: row.code, name: row.display_name_ar, status: row.status };
  });
  const pending = actor.role === 'ADMIN' ? vipRows_('VIP_Staff_Enrollments').rows.filter(function(row) {
    return ['PENDING', 'WHATSAPP_CONFIRMED'].indexOf(vipNormalizeText_(row.status)) !== -1;
  }).map(function(row) {
    return { id: row.enrollment_id, code: row.request_code, name: row.display_name, email: row.identity_email, role: row.requested_role, status: row.status };
  }) : [];
  return {
    actor: actor, cardTypes: cardTypes, pendingEnrollments: pending,
    financialEnabled: vipSetting_('financial_activation').toLowerCase() === 'true',
    publicVerificationEnabled: vipSetting_('public_verification_enabled').toLowerCase() === 'true',
    staffActivationWhatsApp: vipSetting_('staff_activation_whatsapp'),
  };
}
