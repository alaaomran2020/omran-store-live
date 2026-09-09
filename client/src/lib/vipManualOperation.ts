import {
  createStaffRequestCode,
  normalizeEgyptianMobile,
} from "./staffEnrollment";

export type ManualOperationType =
  | "ISSUE_CARD"
  | "ACTIVATE_CARD"
  | "SUSPEND_CARD"
  | "REPLACE_CARD"
  | "RECORD_REDEMPTION"
  | "RECORD_COMPLAINT";

export const manualOperationLabels: Record<ManualOperationType, string> = {
  ISSUE_CARD: "إصدار كارت",
  ACTIVATE_CARD: "تفعيل كارت بعد الدفع",
  SUSPEND_CARD: "إيقاف كارت",
  REPLACE_CARD: "استبدال كارت",
  RECORD_REDEMPTION: "تسجيل خصم",
  RECORD_COMPLAINT: "تسجيل شكوى",
};

export type CardPaymentMethod = "CASH" | "CARD" | "TRANSFER" | "OTHER";

const cleanCell = (value: string | undefined) =>
  (value || "").replace(/[\t\r\n]+/g, " ").trim();

export function egpToPiasters(value: string): number | null {
  const normalized = value.trim().replace(",", ".");
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) return null;
  const amount = Number(normalized);
  return Number.isSafeInteger(Math.round(amount * 100))
    ? Math.round(amount * 100)
    : null;
}

export function createManualOperationId(bytes?: Uint8Array): string {
  return createStaffRequestCode(bytes).replace("OVS-", "OP-");
}

export function buildCardPayment(input: {
  cardSerial: string;
  cardTypeId: string;
  amountEgp: string;
  paymentMethod: CardPaymentMethod;
  paymentReference: string;
  staffId: string;
  paymentId?: string;
  paidAt?: string;
}): { paymentId: string; columns: string[]; tsv: string } | null {
  const cardSerial = cleanCell(input.cardSerial).toUpperCase();
  const cardTypeId = cleanCell(input.cardTypeId).toUpperCase();
  const paymentReference = cleanCell(input.paymentReference);
  const staffId = cleanCell(input.staffId);
  const amount = egpToPiasters(input.amountEgp);
  if (
    !/^[A-Z0-9][A-Z0-9-]{5,39}$/.test(cardSerial) ||
    !cardTypeId ||
    !paymentReference ||
    !staffId ||
    amount === null ||
    amount <= 0
  )
    return null;

  const paymentId =
    input.paymentId || createManualOperationId().replace("OP-", "PAY-");
  const columns = [
    paymentId,
    cardSerial,
    cardTypeId,
    String(amount),
    input.paymentMethod,
    "PENDING",
    paymentReference,
    input.paidAt || new Date().toISOString(),
    staffId,
  ];
  return { paymentId, columns, tsv: columns.join("\t") };
}

export function buildManualOperation(input: {
  operationType: ManualOperationType;
  cardSerial: string;
  membershipId?: string;
  staffId: string;
  staffWhatsApp: string;
  partnerOrBranchId?: string;
  invoiceReference?: string;
  amountEgp?: string;
  discountEgp?: string;
  previousStatus?: string;
  requestedStatus?: string;
  evidenceLink?: string;
  notes?: string;
  operationId?: string;
  createdAt?: string;
}): { operationId: string; columns: string[]; tsv: string } | null {
  const staffWhatsApp = normalizeEgyptianMobile(input.staffWhatsApp);
  const cardSerial = cleanCell(input.cardSerial).toUpperCase();
  const staffId = cleanCell(input.staffId);
  if (
    !/^[A-Z0-9][A-Z0-9-]{5,39}$/.test(cardSerial) ||
    !staffId ||
    !staffWhatsApp
  )
    return null;

  const amount = input.amountEgp?.trim() ? egpToPiasters(input.amountEgp) : 0;
  const discount = input.discountEgp?.trim()
    ? egpToPiasters(input.discountEgp)
    : 0;
  if (amount === null || discount === null || discount > amount) return null;

  if (
    input.operationType === "ACTIVATE_CARD" &&
    !cleanCell(input.invoiceReference)
  )
    return null;
  if (
    input.operationType === "RECORD_REDEMPTION" &&
    (!cleanCell(input.invoiceReference) || amount <= 0 || discount <= 0)
  )
    return null;
  if (
    ["SUSPEND_CARD", "REPLACE_CARD", "RECORD_COMPLAINT"].includes(
      input.operationType
    ) &&
    !cleanCell(input.notes)
  )
    return null;

  const operationId = input.operationId || createManualOperationId();
  const columns = [
    operationId,
    input.operationType,
    cardSerial,
    cleanCell(input.membershipId),
    staffId,
    staffWhatsApp,
    cleanCell(input.partnerOrBranchId),
    cleanCell(input.invoiceReference),
    String(amount),
    String(discount),
    cleanCell(input.previousStatus),
    cleanCell(input.requestedStatus),
    "PENDING",
    cleanCell(input.evidenceLink),
    cleanCell(input.notes),
    input.createdAt || new Date().toISOString(),
    "",
    "",
  ];

  return { operationId, columns, tsv: columns.join("\t") };
}
