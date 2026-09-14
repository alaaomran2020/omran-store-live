import { Badge } from "./primitives";
import type { QaStatus, WorkflowStatus } from "@shared/products";
import type { AdminAvailability, AdminProduct } from "@/lib/admin/adminCatalog";
import {
  AVAILABILITY_LABELS,
  QA_LABELS,
  WORKFLOW_LABELS,
} from "@/admin/adminFormat";

export function WorkflowBadge({ status }: { status: WorkflowStatus | null }) {
  if (!status) {
    return <Badge tone="slate">غير موثّق</Badge>;
  }
  const tone = {
    PUBLISHED: "green",
    REVIEW: "amber",
    REJECTED: "red",
    DRAFT: "slate",
    ERROR: "red",
  }[status] as "green" | "amber" | "red" | "slate";
  return <Badge tone={tone}>{WORKFLOW_LABELS[status]}</Badge>;
}

export function QaBadge({ status }: { status: QaStatus | null }) {
  if (!status) return <Badge tone="slate">بلا قرار جودة</Badge>;
  const tone = { PASS: "green", NEEDS_REVIEW: "amber", FAIL: "red" }[status] as
    | "green"
    | "amber"
    | "red";
  return <Badge tone={tone}>{QA_LABELS[status]}</Badge>;
}

export function AvailabilityBadge({ availability }: { availability: AdminAvailability }) {
  const tone = {
    available: "green",
    unavailable: "red",
    preorder: "purple",
    unknown: "slate",
  }[availability] as "green" | "red" | "purple" | "slate";
  return <Badge tone={tone}>{AVAILABILITY_LABELS[availability]}</Badge>;
}

export function VisibilityBadge({ product }: { product: AdminProduct }) {
  return product.active ? <Badge tone="blue">ظاهر</Badge> : <Badge tone="red">مخفي</Badge>;
}

export function BrandBadge({ brand }: { brand: "OMRAN" | "POPUP" }) {
  return brand === "POPUP" ? (
    <Badge tone="purple">POP UP</Badge>
  ) : (
    <Badge tone="blue">Omran</Badge>
  );
}
