# Omran Trading Company — Brand Guidelines Execution

**Brand:** شركة عمران التجارية  
**Store:** omrantoys.store  
**Market:** Egypt  
**Primary conversion:** WhatsApp  
**Positioning:** Modern Playful Retail  
**Brand equation:** Variety × Easy Choice × Trust × Enjoyment

## 1. Core execution rule

Every storefront, campaign, product card, social asset, and WhatsApp interaction must make the customer's choice easier without inventing information.

Before shipping any experience, verify:

1. Is the product visually clear?
2. Is the next choice obvious?
3. Is every fact verified?
4. Is there one dominant CTA?
5. Does the execution feel recognizably Omran?

## 2. Design tokens

Canonical storefront tokens live in `client/src/index.css`.

| Token | Value | Usage |
| --- | --- | --- |
| Brand Primary | `#1769E0` | Primary CTA, links, active UI |
| Brand Primary Dark | `#123B6D` | Trust, headings, dark surfaces |
| Brand Accent | `#E53935` | Controlled commercial emphasis |
| Brand Yellow | `#FFC83D` | Small playful highlight only |
| Soft Blue | `#EAF4FF` | Discovery surfaces, hover, information |
| Page Background | `#F7F9FC` | Main page background |
| Surface | `#FFFFFF` | Cards, dialogs, content surfaces |
| Primary Text | `#172033` | Main copy |
| Secondary Text | `#5F6B7A` | Supporting copy |
| Border | `#E4E9F0` | Dividers and card borders |
| WhatsApp | `#25D366` | WhatsApp actions only |

Color ratio target: **60% neutral / 25% blue / 10% secondary UI / 5% red-yellow accents**.

## 3. Typography

Primary Arabic font: **Cairo**.

- Body: 400
- Supporting: 600
- Headings: 700
- Campaign headlines: 800 only when needed

Do not use more than three typography levels in a single social asset.

## 4. Product card contract

Order is fixed:

`Image → Product name → key information → primary CTA → secondary details action`

Rules:

- Product image is the visual hero.
- Prefer 1:1 product imagery.
- Do not show long descriptions in the card.
- Do not show fabricated stock, ratings, discounts, urgency, or best-seller claims.
- Current commercial mode hides price numbers until prices are operationally ready.
- Primary CTA: **اسأل عن السعر والتوفر**.
- Secondary CTA: **عرض التفاصيل**.

Implemented in `client/src/components/ProductCard.tsx`.

## 5. Product detail contract

The customer should be able to answer:

1. What is this product?
2. Which category is it in?
3. What verified information is available?
4. How do I ask about price and availability?

Primary conversion remains WhatsApp. Missing information is never guessed.

Implemented in `client/src/components/ProductDetailsDialog.tsx`.

## 6. Homepage architecture

Homepage discovery order:

1. Hero: `اكتشف ألعاب وهدايا لكل مناسبة`
2. Product discovery by category
3. Shop by age
4. Gift ideas
5. Why Omran / trust
6. WhatsApp assisted selling

Primary homepage promise: **اختيارات أكثر. اختيار أسهل. خدمة تثق فيها.**

Implemented in `client/src/pages/Home.tsx`.

## 7. WhatsApp assisted-selling system

WhatsApp is a sales-assistance channel, not merely a contact button.

### Welcome

> أهلاً بيك في شركة عمران التجارية 👋  
> ابعتلنا اسم المنتج أو صورته، ولو محتاج ترشيح قولنا سن الطفل ونوع الهدية اللي بتدور عليها وهنساعدك تختار.

### Product inquiry

Use product name and verified references only. Ask for current price and availability instead of presenting unverified values.

### Gift finder

Collect:

- Child age
- Gift type / recipient context
- Occasion
- Approximate budget

Canonical runtime scripts live in `client/src/lib/productFormat.ts`.

## 8. Social templates

Machine-readable specifications live in `brand/social-templates.json`.

Approved template families:

1. Product Spotlight
2. New Arrival
3. Gift Finder
4. Age Recommendation
5. Product Comparison
6. Educational / Tips

### Product Spotlight

- Product: 60–70% of canvas
- Logo: small and quiet
- One benefit line maximum
- CTA: `اسأل عن السعر والتوفر`

### Gift Finder

- Maximum 3 products
- Lead with age or occasion
- CTA: `قولنا السن وميزانيتك على واتساب`

### Comparison

- Maximum 2 products
- Only compare verified differences
- No fabricated winner or ranking

## 9. Image rules

### Main product image

- Clean white or very light background
- Full product visible
- Accurate colors
- No invented accessories
- Product occupies roughly 70–85% of frame

### AI usage allowed

- Background cleanup
- Dust/noise removal
- Light correction
- Presentation improvement while preserving the exact product

### AI usage prohibited

- Product shape changes
- Fake accessories
- Fake colors
- Misleading scale
- Unsupported features

## 10. UI rules

- Card radius: 16px
- Button radius: 12px
- Pill radius: 999px
- Content max width: 1280px
- Mobile-first interaction
- Filters should use drawers on narrow screens
- No hover-only critical behavior
- Skeleton loading preferred over page-blocking spinners
- Error messages must be customer-readable, never raw technical errors

## 11. Claim governance

Do not publish these claims without evidence:

- `أكبر تشكيلة`
- `الأكثر مبيعًا`
- `رقم 1`
- `الأفضل`
- Fake scarcity or countdowns

Use evidence-led alternatives such as `تشكيلة متنوعة` unless a stronger claim is verified.

## 12. Release QA

Any brand/UI release should pass:

- Lint
- Typecheck
- Tests
- Production build
- Mobile visual QA
- Product image integrity check
- WhatsApp CTA test
- Product-view → WhatsApp event tracking check

The brand system is not considered complete when it only looks correct; it must also preserve data accuracy and the conversion funnel.
