// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import {
  normalizeAdminGatewayPayload,
  parseAvailability,
} from "./adminCatalog";

const HEADER = [
  "id",
  "name",
  "price",
  "category",
  "description",
  "image",
  "active",
  "sort_order",
  "product_prompt",
  "workflow_status",
  "qa_status",
  "source_drive_id",
  "processed_image",
  "review_reason",
  "sku",
  "availability",
  "tags",
];

function row(overrides: Record<string, string>): unknown[] {
  const values: Record<string, string> = {
    id: "",
    name: "",
    price: "",
    category: "",
    description: "",
    image: "",
    active: "TRUE",
    sort_order: "",
    product_prompt: "",
    workflow_status: "PUBLISHED",
    qa_status: "PASS",
    source_drive_id: "",
    processed_image: "",
    review_reason: "",
    sku: "",
    availability: "",
    tags: "",
    ...overrides,
  };
  return HEADER.map(h => values[h] ?? "");
}

describe("normalizeAdminGatewayPayload", () => {
  it("keeps non-published rows visible to admins (diagnostic mode)", () => {
    const payload = {
      values: [
        HEADER,
        row({ id: "OMR-1", name: "منتج منشور" }),
        row({ id: "OMR-2", name: "مسودة", workflow_status: "DRAFT", qa_status: "", active: "FALSE" }),
        row({ id: "OMR-3", name: "تحت المراجعة", workflow_status: "REVIEW", qa_status: "NEEDS_REVIEW" }),
      ],
    };
    const products = normalizeAdminGatewayPayload(payload);
    expect(products).toHaveLength(3);
    expect(products.find(p => p.id === "OMR-2")?.active).toBe(false);
    expect(products.find(p => p.id === "OMR-2")?.workflowStatus).toBe("DRAFT");
  });

  it("tags brands by id prefix so POP UP never mixes with Omran", () => {
    const payload = {
      values: [
        HEADER,
        row({ id: "OMR-1", name: "لعبة" }),
        row({ id: "POP-BAL-1", name: "بالونات", category: "بالونات" }),
      ],
    };
    const products = normalizeAdminGatewayPayload(payload);
    expect(products.find(p => p.id === "OMR-1")?.sourceBrand).toBe("OMRAN");
    expect(products.find(p => p.id === "POP-BAL-1")?.sourceBrand).toBe("POPUP");
  });

  it("parses availability and tags from extended columns", () => {
    const payload = {
      values: [
        HEADER,
        row({ id: "OMR-1", name: "لعبة", availability: "نفد", tags: "مطبخ,بنات" }),
      ],
    };
    const product = normalizeAdminGatewayPayload(payload)[0]!;
    expect(product.availability).toBe("unavailable");
    expect(product.tags).toEqual(["مطبخ", "بنات"]);
  });
});

describe("parseAvailability", () => {
  it.each([
    ["متوفر", "available"],
    ["available", "available"],
    ["نفد", "unavailable"],
    ["out of stock", "unavailable"],
    ["طلب مسبق", "preorder"],
    ["", "unknown"],
    ["غير معروف", "unknown"],
  ])("maps %s → %s", (input, expected) => {
    expect(parseAvailability(input)).toBe(expected);
  });
});
