/**
 * اختبارات نواة أمان لوحة الإدارة: تطبيع الهواتف، OTP، التجزئة، RBAC،
 * وحدود المعدل. كلها دوال نقية — بلا قاعدة بيانات وبلا شبكة.
 */
import { describe, expect, it } from "vitest";
import {
  hasPermission,
  normalizePhone,
  randomOtp,
  randomToken,
  rateLimit,
  secretHash,
  splitPatchFields,
  timingSafeEqual,
  type PatchSplit,
} from "./adminAuth";
import type { AdminRecord } from "./adminStore";

const superAdmin: AdminRecord = {
  id: "a1",
  phone: "+201000000001",
  fullName: "المالك",
  role: "super_admin",
  permissions: ["*"],
  isActive: true,
};

const limitedAdmin: AdminRecord = {
  id: "a2",
  phone: "+201000000002",
  fullName: "موظف",
  role: "limited_admin",
  permissions: ["products.name", "products.price"],
  isActive: true,
};

describe("normalizePhone", () => {
  it("يقبل الأرقام الدولية بمختلف الصيغ", () => {
    expect(normalizePhone("+201000000000")).toBe("+201000000000");
    expect(normalizePhone("201000000000")).toBe("+201000000000");
    expect(normalizePhone("01000000000")).toBe("+01000000000");
    expect(normalizePhone("+20 100 000 0000")).toBe("+201000000000");
    expect(normalizePhone("(+20)100-000-0000")).toBe("+201000000000");
  });

  it("يرفض القيم غير الصالحة", () => {
    expect(normalizePhone("")).toBeNull();
    expect(normalizePhone("abc")).toBeNull();
    expect(normalizePhone("+1")).toBeNull();
    expect(normalizePhone(null)).toBeNull();
    expect(normalizePhone(undefined)).toBeNull();
  });
});

describe("randomOtp / randomToken", () => {
  it("يولّد كودًا من 6 أرقام دائمًا", () => {
    for (let i = 0; i < 200; i++) {
      expect(randomOtp()).toMatch(/^\d{6}$/);
    }
  });

  it("يولّد توكنات بطول hex مضاعف للبايتات", () => {
    expect(randomToken(16)).toMatch(/^[0-9a-f]{32}$/);
    expect(randomToken(32)).toMatch(/^[0-9a-f]{64}$/);
  });

  it("لا يكرر القيم في عينة كبيرة", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 5000; i++) seen.add(randomOtp());
    expect(seen.size).toBeGreaterThan(4900);
  });
});

describe("secretHash / timingSafeEqual", () => {
  it("يعيد نفس الـhash لنفس القيمة", async () => {
    const a = await secretHash("123456");
    const b = await secretHash("123456");
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
  });

  it("يختلف الـhash بين قيمتين مختلفتين", async () => {
    expect(await secretHash("123456")).not.toBe(await secretHash("123457"));
  });

  it("timingSafeEqual يقارن بأمان", () => {
    expect(timingSafeEqual("abc", "abc")).toBe(true);
    expect(timingSafeEqual("abc", "abd")).toBe(false);
    expect(timingSafeEqual("abc", "abcd")).toBe(false);
    expect(timingSafeEqual("", "")).toBe(true);
  });
});

describe("hasPermission", () => {
  it("المدير العام يملك كل شيء عبر *", () => {
    expect(hasPermission(superAdmin, "products.price")).toBe(true);
    expect(hasPermission(superAdmin, "anything.else")).toBe(true);
  });

  it("الدور المحدود يملك فقط ما في قائمته", () => {
    expect(hasPermission(limitedAdmin, "products.name")).toBe(true);
    expect(hasPermission(limitedAdmin, "products.price")).toBe(true);
    expect(hasPermission(limitedAdmin, "products.images")).toBe(false);
    expect(hasPermission(limitedAdmin, "*")).toBe(false);
  });
});

describe("splitPatchFields — حدود RBAC الصارمة", () => {
  it("الدور المحدود يعدّل حقوله المسموحة فقط ويرفض الباقي", () => {
    const split = splitPatchFields(
      { name: "لعبة جديدة", price: 150, description: "وصف", image: "https://x", active: false, stock: 5 },
      limitedAdmin
    );
    expect(split.allowed).toEqual({ name: "لعبة جديدة", price: 150 });
    expect(split.denied.map(d => d.field).sort()).toEqual(["active", "description", "image", "stock"]);
    expect(split.denied.find(d => d.field === "active")?.reason).toBe("super_admin_only");
    expect(split.denied.find(d => d.field === "stock")?.reason).toBe("immutable_field");
  });

  it("المدير العام يمرر كل الحقول المعروفة", () => {
    const split = splitPatchFields(
      { name: "x", price: 10, description: "d", image: "https://i", active: false },
      superAdmin
    ) as PatchSplit;
    expect(split.denied).toEqual([]);
    expect(Object.keys(split.allowed).sort()).toEqual(["active", "description", "image", "name", "price"]);
  });

  it("يرفض الحقول غير المعروفة حتى للمدير العام", () => {
    const split = splitPatchFields({ id: "abc", openId: "x" }, superAdmin);
    expect(split.denied).toHaveLength(2);
    expect(split.allowed).toEqual({});
  });

  it("الجسم الفارغ لا يمرر شيئًا", () => {
    const split = splitPatchFields({}, limitedAdmin);
    expect(split.allowed).toEqual({});
    expect(split.denied).toEqual([]);
  });
});

describe("rateLimit — نافذة ثابتة", () => {
  it("يسمح حتى الحد ثم يرفض داخل النافذة", () => {
    let now = 1_000_000;
    const results: boolean[] = [];
    for (let i = 0; i < 4; i++) {
      results.push(rateLimit("k1", 3, 60_000, now).ok);
    }
    expect(results).toEqual([true, true, true, false]);
  });

  it("يعيد retryAfterSec موجبًا عند الرفض", () => {
    let now = 1_000_000;
    for (let i = 0; i < 3; i++) rateLimit("k2", 3, 60_000, now);
    const r = rateLimit("k2", 3, 60_000, now);
    expect(r.ok).toBe(false);
    expect(r.retryAfterSec).toBeGreaterThan(0);
  });

  it("يصفّر العدّاد عند نافذة جديدة", () => {
    let now = 1_000_000;
    for (let i = 0; i < 3; i++) rateLimit("k3", 3, 60_000, now);
    now = 1_060_001; // نافذة تالية
    expect(rateLimit("k3", 3, 60_000, now).ok).toBe(true);
  });

  it("المفاتيح مستقلة", () => {
    rateLimit("a", 1, 60_000, 1_000_000);
    expect(rateLimit("b", 1, 60_000, 1_000_000).ok).toBe(true);
    expect(rateLimit("a", 1, 60_000, 1_000_000).ok).toBe(false);
  });
});
