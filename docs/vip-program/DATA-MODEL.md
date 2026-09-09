# Omran VIP Card Program — Data model v0.2

All IDs are opaque strings. Money uses integer piasters. Timestamps use ISO 8601 UTC and display in `Africa/Cairo`.

| Entity | Unique controls | Important relationships |
|---|---|---|
| Customers (`المشتركون`) | existing subscriber ID and normalized phone | reused master entity; has memberships, purchases, complaints |
| Memberships | `membership_id`; one active pilot membership per customer/program | belongs to customer; owns cards |
| Card_Types | `card_type_id`, code unique | configures cards and eligibility |
| Cards | `card_id`, serial unique, verification token hash unique | belongs to membership and type; replacement chain |
| Partners | `partner_id`, legal agreement reference unique | has branches and offers |
| Partner_Branches | `partner_branch_id` | belongs to partner |
| Offers | `offer_id` | belongs to provider and has eligibility rules |
| Offer_Eligibility_Rules | `rule_id` | belongs to offer; card type/category/product/branch filters |
| Card_Redemptions | `redemption_id`, `idempotency_key` unique | card, offer, branch, staff and optional purchase |
| Purchases | `purchase_id`, external invoice reference unique per branch | customer, branch and points entries |
| Points ledger (`حركات النقاط`) | existing transaction and source references | reused append-only ledger; points remain disabled pending policy approval |
| Rewards | `reward_id` | creates redemption ledger entries |
| Complaints | `complaint_id`, ticket number unique | customer, card, partner and redemption |
| Card_Replacements | `replacement_id`, old card unique | old and new card; reason and approver |
| Staff users (`الموظفون`) | verified Google email/username unique | reused with ADMIN, CARD_ISSUER, BRANCH_STAFF, PARTNER_MANAGER, SUPPORT and REVIEWER roles |
| Audit logs (`سجل التدقيق`) | immutable event ID | reused append-only audit destination |
| Program_Settings | setting key + version unique | approved configuration with effective dates |

## Atomic redemption transaction

Inside one Apps Script lock: validate employee identity and role; resolve token hash; validate card and offer; calculate discount; check card usage and total offer budget; check idempotency key; append redemption and audit records; then release the lock. A repeated idempotency key returns the existing result without creating a second discount.

## Separation

Public sheets contain only approved program, partner, branch and offer fields. Private sheets hold phone numbers, complaints, staff assignments and ledgers. POP UP remains a `partner/provider` record with its own brand fields; its catalog and product taxonomy are never copied into Omran Toys.
