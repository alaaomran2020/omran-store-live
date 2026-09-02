/** @vitest-environment jsdom */
/**
 * اختبار تصيير لوحة الإدارة: بلا جلسة → شاشة الدخول تظهر بدل شاشة تحطم.
 * fetch يُحاكى بالرفض لأن الاختبار يعمل بلا خادم.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import AdminApp from "./AdminApp";

describe("AdminApp", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("no server in test"))
    );
    window.history.replaceState({}, "", "/admin/login");
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("يعرض شاشة دخول المدراء عندما لا توجد جلسة", async () => {
    render(<AdminApp />);
    expect(await screen.findByText(/دخول المدراء/)).toBeTruthy();
    expect(screen.getByText(/رقم الواتساب الشخصي/)).toBeTruthy();
  });

  it("لا يعرض محتوى اللوحة قبل تأكيد الجلسة", async () => {
    window.history.replaceState({}, "", "/admin/products");
    render(<AdminApp />);
    // بلا جلسة → حارس المسار يعرض شاشة "الجلسة غير صالحة" أولًا
    expect(await screen.findByText(/الجلسة غير صالحة/)).toBeTruthy();
    // ثم يعيد التوجيه لشاشة الدخول بعد لحظة
    expect(await screen.findByText(/دخول المدراء/, {}, { timeout: 3000 })).toBeTruthy();
  });
});
