/**
 * اختبارات المخزن الذاكرى للوحة الإدارة + دمج تجاوزات المنتجات.
 * دورة كاملة: طلب كود → تحقق → جلسة → جلسة صالحة/باطلة → تسجيل خروج.
 */
import { describe, expect, it } from "vitest";
import { MemoryAdminStore } from "./adminStore";
import { randomOtp, randomToken, secretHash, timingSafeEqual } from "./adminAuth";
import {
  applyOverridesToProducts,
  parseProductsCsv,
  type Product,
} from "@shared/products";

const seed = {
  phone: "+201000000000",
  fullName: "المالك",
  role: "super_admin" as const,
  permissions: ["*"],
};

const makeStore = () => new MemoryAdminStore(seed);

/**
 * صفوف الإدارة: تقرأ بحقول النشر أول-فئة (تشخيصيًا) حتى تكون الدمج/الإخفاء
 * قابلاً للاختبار؛ بوابة النشر النهائية تُطبق عند Public API وليس هنا.
 */
const baseProducts: Product[] = parseProductsCsv(
  [
    "id,name,price,category,description,image,active,sort_order,workflow_status,qa_status",
    "p1,لعبة سيارة,100,سيارات,سيارة حمراء,https://img.example.com/a.jpg,TRUE,1,PUBLISHED,PASS",
    "p2,دمية,250,عرائس,دمية ناعمة,,TRUE,2,PUBLISHED,PASS",
  ].join("\n"),
  { includeInactive: true }
);

describe("MemoryAdminStore — دورة الدخول الكاملة", () => {
  it("يجد المدير المزروع بالرقم", async () => {
    const store = makeStore();
    const admin = await store.findAdminByPhone("+201000000000");
    expect(admin?.fullName).toBe("المالك");
    expect(admin?.role).toBe("super_admin");
    expect(admin?.permissions).toEqual(["*"]);
    expect(await store.findAdminByPhone("+201111111111")).toBeNull();
  });

  it("تحدٍّ جديد يُبطل التحدي القديم لنفس الرقم", async () => {
    const store = makeStore();
    await store.createChallenge({
      id: "c1",
      adminId: "mem-admin-1",
      phone: "+201000000000",
      codeHash: "h1",
      linkTokenHash: null,
      expiresAt: new Date(Date.now() + 60_000),
    });
    const first = await store.findActiveChallenge("+201000000000");
    expect(first?.id).toBe("c1");

    await store.revokeChallengesForPhone("+201000000000");
    expect(await store.findActiveChallenge("+201000000000")).toBeNull();
  });

  it("التحدي المنتهي لا يُعتبر نشطًا", async () => {
    const store = makeStore();
    await store.createChallenge({
      id: "c2",
      adminId: "mem-admin-1",
      phone: "+201000000000",
      codeHash: "h",
      linkTokenHash: null,
      expiresAt: new Date(Date.now() - 1000),
    });
    expect(await store.findActiveChallenge("+201000000000")).toBeNull();
  });

  it("دورة جلسة كاملة: إنشاء → قراءة → إبطال", async () => {
    const store = makeStore();
    const token = randomToken(32);
    const tokenHash = await secretHash(token);
    const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000);
    await store.createSession({
      id: "s1",
      adminId: "mem-admin-1",
      tokenHash,
      expiresAt,
      createdAt: new Date(),
      lastSeenAt: new Date(),
      revokedAt: null,
      userAgent: "vitest",
      ipHash: "ip",
    });

    const found = await store.findSessionByTokenHash(tokenHash);
    expect(found?.admin.phone).toBe("+201000000000");
    expect(found?.session.id).toBe("s1");
    expect(await store.findSessionByTokenHash("deadbeef")).toBeNull();

    await store.revokeSession("s1");
    expect((await store.findSessionByTokenHash(tokenHash))?.session.revokedAt).toBeInstanceOf(Date);
  });

  it("تسجيل التدقيق يعيد الأحدث أولًا", async () => {
    const store = makeStore();
    for (let i = 1; i <= 3; i++) {
      await store.insertAudit({
        id: `audit-${i}`,
        adminId: "mem-admin-1",
        adminPhone: "+201000000000",
        action: `action-${i}`,
        entityType: null,
        entityId: null,
        outcome: "ok",
        detail: null,
        ipHash: null,
        createdAt: new Date(1000 + i),
      });
    }
    const rows = await store.recentAudit("mem-admin-1", 10);
    expect(rows.map(r => r.action)).toEqual(["action-3", "action-2", "action-1"]);
  });
});

describe("applyOverridesToProducts — دمج تجاوزات المدراء", () => {
  it("بلا تجاوزات يعيد الكتالوج كما هو", () => {
    expect(applyOverridesToProducts(baseProducts, [])).toEqual(baseProducts);
  });

  it("الحقول غير null تعلو قيم الشيت", () => {
    const merged = applyOverridesToProducts(baseProducts, [
      { productId: "p1", name: "لعبة سيارة 2025", price: 120 },
    ]);
    expect(merged[0].name).toBe("لعبة سيارة 2025");
    expect(merged[0].price).toBe(120);
    expect(merged[0].description).toBe("سيارة حمراء"); // لم يُعدَّل
  });

  it("الحقول null لا تغيّر شيئًا", () => {
    const merged = applyOverridesToProducts(baseProducts, [
      { productId: "p1", name: null, price: null },
    ]);
    expect(merged[0].name).toBe("لعبة سيارة");
    expect(merged[0].price).toBe(100);
  });

  it("active=false يُخفي المنتج من الكتالوج العام", () => {
    const merged = applyOverridesToProducts(baseProducts, [
      { productId: "p1", active: false },
    ]);
    expect(merged.map(p => p.id)).toEqual(["p2"]);
  });

  it("active=true يُظهر منتجًا مخفيًا في الشيت (includeInactive)", () => {
    const hiddenProducts = parseProductsCsv(
      ["id,name,active,workflow_status,qa_status", "p9,منتج مخفي,FALSE,PUBLISHED,PASS"].join("\n"),
      { includeInactive: true }
    );
    const merged = applyOverridesToProducts(hiddenProducts, [
      { productId: "p9", active: true },
    ]);
    expect(merged.map(p => p.id)).toEqual(["p9"]);
    expect(merged[0].active).toBe(true);
  });

  it("منتج غير موجود في الشيت يُتجاهل", () => {
    const merged = applyOverridesToProducts(baseProducts, [
      { productId: "ghost", name: "شبح" },
    ]);
    expect(merged).toHaveLength(2);
  });

  it("تجاوز الصورة يمر عبر تحويل روابط Drive", () => {
    const merged = applyOverridesToProducts(baseProducts, [
      { productId: "p2", image: "https://drive.google.com/file/d/ABC123XYZ456/view" },
    ]);
    expect(merged[1].image).toContain("drive.google.com/thumbnail?id=ABC123XYZ456");
    expect(merged[1].imageSource).toBe("https://drive.google.com/file/d/ABC123XYZ456/view");
  });
});

describe("تطابق كود OTP عبر التجزئة", () => {
  it("التحقق يتم عبر مقارنة الـhash لا النص", async () => {
    const code = randomOtp();
    const storedHash = await secretHash(code);
    expect(timingSafeEqual(storedHash, await secretHash(code))).toBe(true);
    expect(timingSafeEqual(storedHash, await secretHash("000000"))).toBe(
      code === "000000"
    );
  });
});
