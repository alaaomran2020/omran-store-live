const parseJsonList = (raw: string | undefined): string[] => {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(x => typeof x === "string") : [];
  } catch {
    return [];
  }
};

export const ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",

  // ---- لوحة إدارة المدراء (WhatsApp OTP + RBAC) ----
  /** "فلفل" يُخلط مع كل hash سرّي (OTP/جلسة/رابط سحري) — سر إلزامي في الإنتاج */
  adminPepper: process.env.AUTH_PEPPER ?? "",
  whatsappProvider: process.env.WHATSAPP_PROVIDER ?? "",
  whatsappToken: process.env.WHATSAPP_TOKEN ?? "",
  whatsappPhoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID ?? "",
  whatsappOtpTemplate: process.env.WHATSAPP_OTP_TEMPLATE ?? "omran_admin_login",
  whatsappTemplateLang: process.env.WHATSAPP_TEMPLATE_LANG ?? "ar",
  whatsappVerifyToken: process.env.WHATSAPP_VERIFY_TOKEN ?? "",
  whatsappAppSecret: process.env.WHATSAPP_APP_SECRET ?? "",
  /** 1 = إرجاع كود التطوير في الاستجابة (تطوير فقط!) */
  adminDevMode: process.env.AUTH_DEV_MODE === "1",

  // ---- زرع حساب مدير مبدئي (مخزن الذاكرة في التطوير/المعاينة فقط) ----
  adminPhone: process.env.ADMIN_PHONE ?? "",
  adminName: process.env.ADMIN_NAME ?? "",
  adminRole: process.env.ADMIN_ROLE ?? "super_admin",
  adminPermissions: parseJsonList(process.env.ADMIN_PERMISSIONS),
};
