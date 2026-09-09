/**
 * Omran VIP Card Program — pilot schema initializer.
 *
 * Add this file to the existing bound Apps Script project only after approval.
 * It creates missing pilot sheets and headers; it does not issue cards, activate
 * benefits, publish partners, expose a web route or write financial events.
 */

const VIP_PILOT_SCHEMA_VERSION = '0.2.0-DRAFT';

// Reuse the master database instead of creating parallel customer, staff,
// points or audit stores.
const VIP_EXISTING_DEPENDENCIES = {
  customers: 'المشتركون',
  pointsAccounts: 'حسابات النقاط',
  pointsLedger: 'حركات النقاط',
  staff: 'الموظفون',
  audit: 'سجل التدقيق',
};

const VIP_PILOT_SHEETS = {
  VIP_Memberships: ['membership_id', 'subscriber_id', 'program_code', 'status', 'started_at', 'ends_at', 'created_at', 'updated_at'],
  VIP_Card_Types: ['card_type_id', 'code', 'display_name_ar', 'sale_price_piasters', 'validity_days', 'status', 'approval_id', 'version', 'effective_from', 'effective_to'],
  VIP_Cards: ['card_id', 'membership_id', 'card_type_id', 'serial_number', 'verification_token_hash', 'status', 'payment_reference', 'issued_at', 'activated_at', 'expires_at', 'replaced_by_card_id', 'created_by', 'updated_at'],
  VIP_Partners: ['partner_id', 'legal_name', 'trade_name', 'activity', 'contact_phone', 'agreement_ref', 'agreement_starts_at', 'agreement_ends_at', 'status', 'approved_at'],
  VIP_Partner_Branches: ['partner_branch_id', 'partner_id', 'display_name', 'address', 'city', 'status'],
  VIP_Offers: ['offer_id', 'provider_type', 'provider_id', 'partner_branch_id', 'display_name_ar', 'discount_kind', 'discount_value', 'maximum_discount_piasters', 'minimum_invoice_piasters', 'usage_limit_per_card', 'period_limit', 'period_days', 'starts_at', 'ends_at', 'total_budget_piasters', 'funding_owner', 'stackable', 'status', 'approval_id'],
  VIP_Offer_Rules: ['rule_id', 'offer_id', 'rule_kind', 'operator', 'rule_value', 'status'],
  VIP_Redemptions: ['redemption_id', 'idempotency_key', 'card_id', 'offer_id', 'partner_branch_id', 'purchase_id', 'invoice_piasters', 'discount_piasters', 'payable_piasters', 'funding_owner', 'status', 'occurred_at', 'recorded_by'],
  VIP_Purchases: ['purchase_id', 'customer_id', 'omran_branch_id', 'invoice_reference', 'invoice_piasters', 'status', 'purchased_at', 'recorded_by'],
  VIP_Rewards: ['reward_id', 'display_name_ar', 'points_cost', 'reward_kind', 'value_piasters', 'usage_limit', 'starts_at', 'ends_at', 'status', 'approval_id'],
  VIP_Complaints: ['complaint_id', 'ticket_number', 'customer_id', 'card_id', 'partner_id', 'redemption_id', 'contact_phone', 'visited_at', 'invoice_piasters', 'expected_discount_piasters', 'applied_discount_piasters', 'receipt_evidence_ref', 'status', 'assigned_to', 'created_at', 'resolved_at', 'resolution_note'],
  VIP_Card_Replacements: ['replacement_id', 'old_card_id', 'new_card_id', 'reason', 'fee_piasters', 'approved_by', 'created_at'],
  VIP_Staff_Enrollments: ['enrollment_id', 'request_code', 'display_name', 'phone_e164', 'whatsapp_e164', 'identity_email', 'requested_role', 'status', 'requested_at', 'whatsapp_verified_at', 'approved_by', 'approved_at'],
  VIP_Program_Settings: ['setting_key', 'setting_value', 'value_type', 'version', 'status', 'effective_from', 'effective_to', 'approved_by', 'approved_at'],
};

function setupVipPilotSheets() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  if (!spreadsheet) throw new Error('Run this function from the bound Omran master spreadsheet.');
  const actor = String(Session.getActiveUser().getEmail() || '').trim();
  if (!actor) throw new Error('A verified Google account is required.');

  Object.keys(VIP_EXISTING_DEPENDENCIES).forEach(function(key) {
    const sheetName = VIP_EXISTING_DEPENDENCIES[key];
    if (!spreadsheet.getSheetByName(sheetName)) throw new Error('MISSING_EXISTING_DEPENDENCY: ' + sheetName);
  });

  const result = [];
  Object.keys(VIP_PILOT_SHEETS).forEach(function(sheetName) {
    const headers = VIP_PILOT_SHEETS[sheetName];
    let sheet = spreadsheet.getSheetByName(sheetName);
    const created = !sheet;
    if (!sheet) sheet = spreadsheet.insertSheet(sheetName);
    if (sheet.getLastRow() === 0) {
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      sheet.setFrozenRows(1);
      sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#12345B').setFontColor('#FFFFFF');
    } else {
      const actual = sheet.getRange(1, 1, 1, headers.length).getDisplayValues()[0];
      if (actual.join('|') !== headers.join('|')) throw new Error('HEADER_MISMATCH: ' + sheetName);
    }
    result.push({ sheet: sheetName, created: created, columns: headers.length });
  });

  const settings = spreadsheet.getSheetByName('VIP_Program_Settings');
  if (settings && settings.getLastRow() === 1) {
    settings.appendRow(['schema_version', VIP_PILOT_SCHEMA_VERSION, 'string', 1, 'DRAFT', new Date().toISOString(), '', actor, '']);
    settings.appendRow(['financial_activation', 'false', 'boolean', 1, 'DRAFT', new Date().toISOString(), '', actor, '']);
    settings.appendRow(['points_enabled', 'false', 'boolean', 1, 'DRAFT', new Date().toISOString(), '', actor, '']);
    settings.appendRow(['public_verification_enabled', 'false', 'boolean', 1, 'DRAFT', new Date().toISOString(), '', actor, '']);
    settings.appendRow(['staff_activation_whatsapp', '', 'string', 1, 'DRAFT', new Date().toISOString(), '', actor, '']);
    settings.appendRow(['schema_dependencies', JSON.stringify(VIP_EXISTING_DEPENDENCIES), 'json', 1, 'DRAFT', new Date().toISOString(), '', actor, '']);
  }

  console.log(JSON.stringify({ ok: true, schemaVersion: VIP_PILOT_SCHEMA_VERSION, actor: actor, sheets: result }));
  return result;
}

function auditVipPilotSchema() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const findings = [];
  Object.keys(VIP_PILOT_SHEETS).forEach(function(sheetName) {
    const expected = VIP_PILOT_SHEETS[sheetName];
    const sheet = spreadsheet.getSheetByName(sheetName);
    if (!sheet) {
      findings.push({ sheet: sheetName, status: 'MISSING' });
      return;
    }
    const actual = sheet.getRange(1, 1, 1, expected.length).getDisplayValues()[0];
    findings.push({ sheet: sheetName, status: actual.join('|') === expected.join('|') ? 'PASS' : 'HEADER_MISMATCH' });
  });
  console.log(JSON.stringify({ schemaVersion: VIP_PILOT_SCHEMA_VERSION, findings: findings }));
  return findings;
}
