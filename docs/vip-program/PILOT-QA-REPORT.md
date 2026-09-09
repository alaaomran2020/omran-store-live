# Omran VIP — Pilot QA report

Date: 2026-09-09. Scope: development branch and test-only Google Sheet. No production sale or live card activation.

| Scenario | Evidence | Status |
| --- | --- | --- |
| Unique operation/payment IDs | Unit tests and native duplicate validation | PASS |
| EGP converted to integer piasters | `vipManualOperation.test.ts` | PASS |
| Activation requires payment reference and positive collection | `vipManualOperation.test.ts` | PASS |
| Payment row remains pending before review | Unit test and UI output | PASS |
| Egyptian employee WhatsApp validation | `staffEnrollment.test.ts` | PASS |
| Local QR contains serial only | `vipQr.test.ts` | PASS |
| No phone/customer data in public QR payload | `vipQr.test.ts` | PASS |
| Duplicate payment reference detection | Native Sheet validation and red highlight | PASS — configuration inspection |
| Repeated completed payment warning | Native Sheet conditional format | PASS — configuration inspection |
| Expired/stopped/lost card redemption rejected | Manual procedure designed | NOT RUN — needs seeded test cards |
| Maximum discount and minimum invoice | Rule fields designed | NOT RUN — needs approved test offer |
| Silver usage limit | Rule fields designed | NOT RUN — needs approved test settings |
| Simultaneous double redemption | No atomic backend by owner decision | BLOCKED — launch stop condition |
| Points earn/redeem/reverse/expire | Ledger schema exists; policy disabled | BLOCKED — commercial policy pending |
| Lost-card replacement invalidates old card | Manual procedure designed | NOT RUN — supervised scenario required |
| Complaint escalation | Sheet workflow exists | NOT RUN — staff role-play required |
| Mobile RTL customer and employee flows | Responsive code/build checked | PARTIAL — representative-device test pending |
| Printed QR scan | SVG generator tested | NOT RUN — physical sample required |
| Storefront and POP UP regression | Local build and automated suite | PASS automated; visual smoke pending |

## Automated evidence

- VIP unit tests: 13/13 passed.
- TypeScript: passed.
- Lint: passed with three pre-existing unrelated warnings.
- Vite production build: passed; existing bundle-size warning remains.
- GitHub Smart Search Validation: passed.
- Pull-request storefront validation: passed; production deploy job is excluded for pull requests.

## Release decision

**NOT READY FOR LIVE SALE.** Remaining release blockers are written legal approval, signed partner offers, approved prices/validity/limits, role-based test accounts, seeded end-to-end operational tests, physical QR scan evidence, and a safe answer to simultaneous redemption. Partner self-service and live public verification remain prohibited under the manual no-API architecture.
