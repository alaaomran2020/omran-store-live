# OMRAN TOYS — Live Design System 2026.09

## Status

Production implementation baseline for `omran-store-live`.

This document resolves the coexistence of older brand documentation and the currently shipped storefront palette.

## Source-of-truth order

When visual sources disagree, use this order:

1. Approved Omran logo and approved brand assets.
2. Current production implementation in `client/src/index.css`.
3. Canonical design-system layer in `client/src/design-system.css`.
4. Current execution documentation.
5. Older brand guideline documents as historical reference only.

The older v1 guideline palette (`#10152F`, `#2F5BEA`, `#FFFDF8`) is therefore not allowed to silently overwrite the current production palette.

## Current production anchors

- Primary blue: `#1769E0`
- Primary blue hover: `#1258BD`
- Trust navy: `#123B6D`
- Commercial red used for accessible text: `#C62828`
- Yellow accent: `#FFC83D`
- Soft blue: `#EAF4FF`
- Page neutral: `#F7F9FC`
- Surface: `#FFFFFF`
- Text: `#172033`
- Secondary text: `#5F6B7A`
- Border: `#E4E9F0`
- WhatsApp conversion green: existing accessible runtime token in `index.css`; reserved for WhatsApp actions.

## Architecture

`Tokens → Primitives → Components → Commerce Components → Patterns → Pages`

### Token files

- `client/src/index.css`: legacy-compatible runtime brand tokens and global base styles.
- `client/src/design-system.css`: canonical raw scales, semantic aliases, typography, spacing, radius, elevation, motion and layout foundations.

The design-system layer is additive so existing production utilities continue to work while components progressively migrate toward semantic tokens.

## Brand boundaries

### Omran Toys

May use the complete brand palette and playful retail accents.

### POP UP – Gifts & Balloons

May share neutral primitives and technical components, but must not inherit Omran Toys-specific commercial colors, decorative motifs or catalog behavior unintentionally.

### Admin

May reuse foundational spacing, typography, focus, accessibility and semantic state tokens. Consumer toy decoration should remain restrained.

## Color usage

Use strong brand colors selectively. Product imagery remains visually dominant.

- Blue: primary actions, links, active states.
- Navy: headings, trust, strong text and dark surfaces.
- Red: controlled commercial emphasis only; never fake urgency.
- Yellow: small playful accents and non-critical badges.
- WhatsApp green: WhatsApp conversion only.
- Neutral surfaces: product browsing, reading, forms and operations.

Never use color alone to communicate meaning.

## Typography

Arabic-first.

Primary stack:

`Cairo, "Noto Kufi Arabic", "Segoe UI", Tahoma, Arial, sans-serif`

Semantic sizes are defined in `design-system.css`:

- Display: 40 / 48
- H1: 32 / 40
- H2: 28 / 36
- H3: 24 / 32
- Title: 20 / 28
- Body Large: 18 / 30
- Body: 16 / 26
- Body Small: 14 / 22
- Caption: 12 / 18

Arabic line-height remains intentionally comfortable.

## Spacing

Canonical 4px scale:

`4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96, 128`

Avoid new arbitrary values unless the component has a measured layout reason.

## Radius

- xs: 6px
- sm: 8px
- md: 12px
- lg: 16px
- xl: 24px
- full: 9999px

Pills are reserved for chips, badges and compact status UI.

## Elevation

Five levels exist from flat to overlay. Elevation expresses hierarchy and should not make every card appear floating.

`ProductCard` consumes the canonical elevation/radius variables.

## Motion

- instant: 100ms
- fast: 150ms
- standard: 220ms
- slow: 320ms

Motion is feedback-oriented. Reduced-motion mode neutralizes system motion durations and component transforms where implemented.

## Accessibility

Target: WCAG 2.2 AA.

Core primitive changes enforce a 44px minimum interactive height for Button and Input. Existing color contrast guards remain in `client/src/accessibility/wcag-aa.test.ts`.

Focus must remain visible. Native semantics are preferred over ARIA patches.

## Button system

Canonical primitive: `client/src/components/ui/button.tsx`.

Variants:

- default / primary
- secondary
- outline
- ghost
- destructive
- link
- WhatsApp

WhatsApp is a dedicated conversion variant and does not replace brand primary.

## ProductCard contract

The product remains the hero.

Order:

`Image → Name → Verified context → WhatsApp CTA → Details`

Rules:

- Price is optional.
- Never render fake price, `undefined`, `null` or fabricated availability.
- WhatsApp is the primary conversion action.
- POP UP catalog detection remains separate.
- Reduced-motion behavior is respected.
- Canonical product URL behavior is preserved.

## RTL

The storefront remains RTL-first. New layout work should prefer logical CSS properties where practical and must verify arrows, drawers, breadcrumbs, SKU/numeric mixing and keyboard flow.

## Copy guardrails

Customer-facing copy defaults to Egyptian Arabic.

Use:

- `عمران تويز`
- `عرايس`
- `عربيات`
- `VIP / خصومات / مميزات / عروض` according to context

Avoid:

- `دمى`
- `سيارات` for toy cars
- `ولاء`
- unsupported claims such as best, biggest, number one, fake scarcity or unverified stock promises.

Trust direction when contextually relevant:

`لما تختار عمران تويز… إنت بتختار ثقة`

## Commerce integrity

This design-system implementation must not change publication gates, search logic, analytics logic, product data filtering, catalog separation or WhatsApp message integrity.

Visual refactors are not permission to weaken data governance.

## QA gates

A design-system release is acceptable only after:

- TypeScript check
- lint
- Vitest suite
- production build
- WCAG color regression test
- design-system token regression test
- ProductCard tests
- POP UP regression checks
- WhatsApp CTA regression checks

## Audit classification

### KEEP

- Current accessible production palette.
- Cairo Arabic stack.
- Existing WCAG contrast tests.
- Existing publication/data logic.
- Existing POP UP catalog separation.
- Existing smart-search logic.
- Existing WhatsApp-first conversion.

### NORMALIZE

- Raw/semantic tokens.
- Spacing/radius/elevation/motion foundations.
- Button sizes and states.
- Input sizing.
- ProductCard radius/elevation/motion.

### REFACTOR PROGRESSIVELY

- Components containing repeated arbitrary visual values.
- Shared components that can migrate to semantic tokens without changing behavior.
- RTL physical properties when touched for functional work.

### DEPRECATE

- Older palette values as implementation authority.
- New one-off hardcoded visual values where canonical tokens already exist.

### REMOVE

- Duplicate decorative CTAs.
- Unsupported visual claims or fake data.
- Brand leakage from Omran Toys into POP UP.

## Definition of done

The design system is complete when it is loaded by the application, protected by tests, documented, accessible, compatible with existing routes and business logic, and capable of evolving without reintroducing arbitrary visual values.
