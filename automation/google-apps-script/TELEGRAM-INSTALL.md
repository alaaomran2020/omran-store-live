# Omran Toys Bot — Telegram Product Intake

## Architecture

Telegram Bot → Google Apps Script Web App → Google Drive + `إدخال المنتجات` → review/approval → `كتالوج النشر الآلي` → GitHub Actions → Cloudflare Pages.

No VPS, no traditional backend, no Google API key in the storefront.

## 1. Update the deployed Apps Script

Replace the current Apps Script code with the repository file:

`automation/google-apps-script/subscribers.gs`

The same Web App keeps VIP subscribers working and adds Telegram intake + catalog CSV.

## 2. Add the Telegram bot token securely

In Apps Script:

Project Settings → Script Properties → Add script property

- Property: `TELEGRAM_BOT_TOKEN`
- Value: the BotFather token

Do not commit the token to GitHub and do not place it in any `VITE_*` variable.

## 3. Redeploy the existing Web App

Deploy → Manage deployments → Edit → Version: New version → Deploy.

Keep:
- Execute as: Me
- Who has access: Anyone

Prefer editing the existing deployment so the current `/exec` URL stays unchanged.

## 4. Register the Telegram webhook

In the Apps Script editor select `setupTelegramBot` and press Run once.

The function automatically:
- creates/reuses `Omran Telegram Product Intake` in Google Drive,
- creates a random webhook key in Script Properties,
- registers the deployed Web App URL with Telegram.

Then run `getTelegramWebhookInfo` and confirm Telegram returns `ok: true` and no `last_error_message`.

## 5. Employee access

Authorization is read from sheet `الموظفون`:
- `معرف الدخول` = Telegram user ID
- `حالة الموافقة` = `APPROVED`
- `نشط` = TRUE

Unknown users who send `/start` are automatically added as `PENDING` and cannot submit products until approved.

Admins can also approve from Telegram:

`/approve TELEGRAM_ID`

and suspend with:

`/suspend TELEGRAM_ID`

## 6. Employee product format

Send one product photo with this caption:

```text
اسم: عربية ريموت كبيرة
القسم: سيارات وطائرات ريموت
السعر:
الكمية:
ملاحظات: أحمر وأزرق
```

Only `اسم` is required. Price and quantity are optional.

## 7. Intake behavior

A successful message creates a row in `إدخال المنتجات` with:
- source `Telegram`
- Drive image URL
- generated `INT-TG-*` intake ID
- image check TRUE after successful download
- duplicate state `CLEAR` or `POSSIBLE_DUPLICATE`
- content state `RAW`
- QA `NEEDS_REVIEW`
- workflow `NEEDS_REVIEW`

Exact Telegram image duplicates (`file_unique_id`) are rejected without creating another row.

## 8. Publication gate

The existing `كتالوج النشر الآلي` formula already includes rows from `إدخال المنتجات` only when:

- `حالة سير العمل` = `PUBLISHED`
- `حالة الجودة` = `PASS`
- `بوابة المراجعة` = `PASS`

The Apps Script exposes that approved result as CSV via:

`/exec?action=catalog`

The production workflow checks this live feed every 15 minutes. Until Apps Script v2 is redeployed, CI safely falls back to the repository catalog CSV.
