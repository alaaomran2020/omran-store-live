#!/usr/bin/env node
/**
 * scripts/seed-admin.mjs — زرع/تحديث حساب مدير في قاعدة بيانات MySQL.
 *
 * الاستخدام:
 *   DATABASE_URL="mysql://user:pass@host:3306/omran_store" \
 *   ADMIN_PHONE="+201000000000" \
 *   ADMIN_NAME="المالك" \
 *   ADMIN_ROLE="super_admin" \
 *   ADMIN_PERMISSIONS='["*"]' \
 *   node scripts/seed-admin.mjs
 *
 * - ADMIN_ROLE: super_admin | limited_admin
 * - ADMIN_PERMISSIONS: JSON array (افتراضي ["*"] للمدير العام، أو صلاحيات
 *   التحرير المحدودة للدور المحدود).
 * - آمن للتكرار: ON DUPLICATE KEY UPDATE يحدّث الاسم/الدور/الصلاحيات فقط.
 *
 * لا تضع أرقامًا تجريبية في الإنتاج أبدًا — هذا السكربت للتشغيل اليدوي
 * مرة واحدة على الخادم، وليس جزءًا من مسار النشر.
 */
import mysql from "mysql2/promise";

const required = ["DATABASE_URL", "ADMIN_PHONE"];
for (const key of required) {
  if (!process.env[key]) {
    console.error(`[seed-admin] مفقود: ${key}`);
    process.exit(1);
  }
}

const phone = String(process.env.ADMIN_PHONE).replace(/[^\d+]/g, "");
if (!/^\+\d{10,15}$/.test(phone)) {
  console.error("[seed-admin] ADMIN_PHONE يجب أن يكون بصيغة E.164 مثل +201000000000");
  process.exit(1);
}

const role = process.env.ADMIN_ROLE === "limited_admin" ? "limited_admin" : "super_admin";
let permissions;
try {
  permissions = JSON.parse(process.env.ADMIN_PERMISSIONS || "[]");
} catch {
  console.error("[seed-admin] ADMIN_PERMISSIONS ليس JSON صالحًا");
  process.exit(1);
}
if (!Array.isArray(permissions) || permissions.length === 0) {
  permissions =
    role === "super_admin"
      ? ["*"]
      : ["products.name", "products.price", "products.description", "products.images"];
}

const name = process.env.ADMIN_NAME || (role === "super_admin" ? "المالك" : "موظف التحرير");

const conn = await mysql.createConnection(process.env.DATABASE_URL);
try {
  await conn.execute(
    `INSERT INTO admin_users (id, phone, full_name, role, permissions, is_active)
     VALUES (UUID(), ?, ?, ?, ?, 1)
     ON DUPLICATE KEY UPDATE
       full_name = VALUES(full_name),
       role = VALUES(role),
       permissions = VALUES(permissions),
       is_active = 1`,
    [phone, name, role, JSON.stringify(permissions)]
  );
  console.log(`[seed-admin] تم الحفظ: ${phone} (${name}, ${role})`);
} finally {
  await conn.end();
}
