// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import SkipLink from "./SkipLink";

afterEach(cleanup);

function renderShell() {
  return render(
    <div>
      <SkipLink />
      <header>
        <nav aria-label="أقسام المتجر">
          <a href="/products">لعب الأطفال</a>
        </nav>
      </header>
      <main id="main-content" tabIndex={-1}>
        <h1>الكتالوج</h1>
      </main>
    </div>
  );
}

describe("رابط تخطي المحتوى الرئيسي", () => {
  it("يكون أول عنصر في ترتيب التنقل ويستهدف المحتوى الرئيسي", () => {
    renderShell();

    const skipLink = screen.getByTestId("skip-link");
    expect(skipLink.tagName).toBe("A");
    expect(skipLink.getAttribute("href")).toBe("#main-content");
    expect(skipLink.textContent?.trim()).toBe("تخطَّ إلى المحتوى الرئيسي");
    expect(screen.getAllByRole("link")[0]).toBe(skipLink);
  });

  it("ينقل التركيز فعليًا إلى main بدل الاعتماد على تحديث العنوان فقط", () => {
    renderShell();

    const skipLink = screen.getByTestId("skip-link");
    skipLink.focus();
    fireEvent.click(skipLink);

    expect(document.activeElement).toBe(document.getElementById("main-content"));
  });
});
