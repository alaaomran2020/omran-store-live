export const SOCIAL_EMBED_CONFIG = {
  instagramProfileUrl: "https://www.instagram.com/omrantoys.store/",
  instagramFeaturedPostUrl: "https://www.instagram.com/p/DcTpBu2lOt8/",
  facebookPageUrl: "https://www.facebook.com/profile.php?id=61590544803396&locale=ar_AR",
  popupInstagramProfileUrl: "https://www.instagram.com/popup.gifts_balloons?stkn=MmxoajAyNDNocG00",
  popupFacebookPageUrl: "https://www.facebook.com/profile.php?id=61589179737729",
  /**
   * رقم واتساب المتجر بالصيغة الدولية بدون "+" (مثال: "2010XXXXXXXX").
   * الرقم الإنتاجي الحالي: +201555570269 (WhatsApp). يُستخدم كقيمة احتياطية
   * عندما لا يكون `VITE_WHATSAPP_NUMBER` مضبوطًا وقت البناء.
   * اتركه فارغًا فقط لإخفاء زر "اطلب عبر واتساب" تمامًا — لكن في الإنتاج
   * يجب أن يكون مضبوطًا، وإلا لا يُعرض زر واتساب بدل عرض رقم خاطئ.
   */
  whatsappNumber: "201555570269",
} as const;

export function isOfficialMetaEmbedUrl(value: string): boolean {
  const url = new URL(value);
  return url.protocol === "https:" && ["www.instagram.com", "www.facebook.com"].includes(url.hostname);
}
