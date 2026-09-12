# Accessibility audit — WCAG 2.2 AA

Scope: `alaaomran2020/omran-store-live`, baseline `f12d41738afe99d0c5f45bd26cdba8a42ed16679` (PR #71).
Stack unchanged: Vite 7 · React 19 · TypeScript · Tailwind CSS v4. No new dependency, no backend, no API.
Rule applied throughout: **Semantic HTML > native controls > ARIA.**

## 1. Findings before the fixes

| # | Finding | Severity | Where |
| --- | --- | --- | --- |
| 1 | No bypass mechanism: every page forced keyboard users through the announcement bar and the full brand navigation before the catalog | **Critical** | all routes |
| 2 | `aria-modal="true"` surfaces did not contain focus — Tab walked out of the product dialog, the lightbox and the mobile filter drawer into the page behind | **Critical** | `ProductDetailsDialog`, `ProductMediaGallery`, `ProductFacetControls` |
| 3 | Escape inside the lightbox closed the whole product dialog: the dialog registered its `document` listener first, so its handler ran before the lightbox handler (which stopped propagation too late) | **High** | `ProductDetailsDialog` + `ProductMediaGallery` |
| 4 | Search suggestions were real tab stops; tabbing out of the input unmounted the listbox while an option held focus, dropping focus to `<body>` | **High** | `SmartProductSearch` |
| 5 | Search input had no label element — only `aria-label` + placeholder | **High** | `SmartProductSearch` |
| 6 | Contrast below 4.5:1 on real text: WhatsApp CTA white on `#25d366` **1.98:1**, `brand-red` text **4.23:1** on white / **3.86:1** on red-50, Facebook label `#1877f2` **4.23:1**, footer `text-white/45` **3.56:1**, VIP help text `brand-muted/80` **3.18:1** | **High** | tokens + `OfficialSocialEmbeds`, `SiteFooter`, `VipSignup` |
| 7 | Focus indicators suppressed (`focus-visible:outline-none`) and replaced by 10–25 % opacity rings; the global outline was 35 % transparent blue | **High** | 11 files |
| 8 | Focus restore could target a detached node (Back/Forward, re-filtered grid) and silently dropped focus to `<body>` | **High** | `ProductDetailsDialog` |
| 9 | `role="list"` containing `<button>` children without `role="listitem"` (invalid ARIA) | Medium | `ProductDetailsDialog` option groups |
| 10 | `aria-label` on a plain `<div>` — dropped by assistive tech | Medium | gallery thumbnails |
| 11 | Marquee loop copy announced twice by screen readers and reachable with Tab | Medium | `AnnouncementBar` |
| 12 | Filter drawer claimed `role="dialog"` while closed and on desktop, where it is not modal | Medium | `ProductFacetControls` |
| 13 | Heading order inverted on `/`: the POP UP promo `<h2>` preceded the page `<h1>` | Medium | `PopUpPromo` |
| 14 | `scroll-behavior: smooth` ignored `prefers-reduced-motion`; skeleton pulse / refresh spin had no reduced-motion variant | Medium | `index.css`, `ProductCard`, `Products`, `VipSignup`, `ProductIntake` |
| 15 | English `ErrorBoundary` copy inside a `lang="ar"` document | Medium | `ErrorBoundary` |
| 16 | Smallest targets are 36×36 px (search clear, filter chips) — compliant with 2.5.8 (24 px) but under the 44 px AAA advisory | Low | `SmartProductSearch`, `ProductFacetControls`, `Products` |
| 17 | Staff/admin dark screens used a border-colour-only focus state | Low | `VipOperations`, `VipStaffRegistration` |

## 2. Fixes applied

- **Skip link** — `client/src/components/SkipLink.tsx`, mounted once in `App.tsx` so it is the first stop in the tab order on every route. Hidden until focused (no layout shift), RTL-safe (`focus:start-3`), and it moves real focus, not just the hash.
- **One `<main>` target** — `MAIN_CONTENT_ID` (`main-content`) + `tabIndex={-1}` added to the single `<main>` of 13 routes/admin shell; every page now has exactly one main landmark that matches the skip link.
- **Modal focus containment** — `client/src/lib/a11y.ts` (focusable discovery + modal stack) and `client/src/hooks/useFocusTrap.ts`. Tab/Shift+Tab wrap inside the surface; Escape is delegated to the **top-most** surface only, which is what fixed finding 3 structurally.
- **Focus restore ladder** — previous trigger → matching product card (`[data-product-id]`) → `main`. Back/Forward, related-product navigation and re-filtered grids all restore focus deterministically.
- **Search** — real `<label>` (visually hidden, `htmlFor`), suggestions are `tabIndex={-1}` and driven by `aria-activedescendant`, listbox is labelled, "هل تقصد" is a polite live region.
- **Groups** — dialog colour/option groups are `role="group"` + `aria-labelledby` (replacing invalid `role="list"`); catalog category and age chip rows expose named groups with `aria-pressed` state.
- **Contrast tokens** — `brand-red` `#e53935 → #c62828` (5.62:1 on white), WhatsApp green `#25d366 → #0d8649` (4.64:1 with white text; hover `#0a6e3b`), Facebook label `#1877f2 → #1666d0` (5.46:1), footer `white/45 → white/70`, VIP help text → `brand-muted`.
- **Focus visibility** — global outline is now solid `brand-blue` (5.08:1 on white, 11.2:1 on navy); every weak ring was raised to a solid brand token or `white/70` on dark surfaces.
- **Motion & language** — `prefers-reduced-motion` now disables smooth scrolling; pulse/spin animations get `motion-reduce:animate-none`; the error fallback declares `lang="en"`.

Deliberate non-changes: touch targets were left at 36–44 px to preserve the approved layout (2.5.8 passes), and the existing Arabic accessible names ("التفاصيل", "إغلاق عرض الصورة", "الصورة التالية") were kept so the shipped QA contracts stay intact.

## 3. Verified as already correct

- Zoom is not restricted (`viewport-fit=cover`, no `user-scalable=no`, no `maximum-scale`).
- `html lang="ar" dir="rtl"`; every route has exactly one `<h1>` and an ordered heading chain.
- No `tabIndex > 0`, no clickable `<div>`/`<span>`, no keyboard traps left in the tab order.
- Product images use the product name as `alt`; the missing-image placeholder is `role="img"` with an Arabic name.
- Breadcrumbs are a real `<nav>` + `<ol>/<li>` with `aria-current="page"`.
- Icon-only buttons carry Arabic names — no bare `×`.
- Radix primitives under `components/ui/` are unused dead code and were not migrated.

## 4. Regression coverage added

`client/src/accessibility/wcag-aa.test.ts` reads the real tokens and recomputes every contrast pair (plus the viewport/zoom and document-language contract), so a brand tweak that drops text under 4.5:1 fails CI. New behaviour tests cover the skip link, the single `main-content` landmark, dialog focus containment, the nested-lightbox Escape regression, focus restore when the trigger disappears, named option groups, non-tabbable search options, drawer modality and the marquee loop copy.

## 5. Gate results

| Gate | Result |
| --- | --- |
| `pnpm lint` (oxlint) | 0 warnings / 0 errors — 150 files |
| `pnpm check` (tsc --noEmit) | clean |
| `pnpm test` (vitest) | 26 files · 144 tests passed |
| `pnpm build` (vite) | success |
| `node scripts/integration-audit.mjs` | PASS |

Remaining known gap to a full AA claim: the marquee is a continuous animation that still moves for users who did not opt out of motion beyond the reduced-motion branch already handled, and low-priority findings 16–17 above are documented rather than redesigned.
