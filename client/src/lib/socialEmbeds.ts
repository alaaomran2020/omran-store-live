export const SOCIAL_EMBED_CONFIG = {
  instagramProfileUrl: "https://www.instagram.com/omrantoys.store/",
  instagramFeaturedPostUrl: "https://www.instagram.com/p/DcTpBu2lOt8/",
  facebookPageUrl: "https://www.facebook.com/profile.php?id=61590544803396&locale=ar_AR",
  /**
   * رقم واتساب المتجر بالصيغة الدولية بدون "+" (مثال: "2010XXXXXXXX").
   * اتركه فارغًا لإخفاء زر "اطلب عبر واتساب" من بطاقات المنتجات.
   */
  whatsappNumber: "",
} as const;

export function isOfficialMetaEmbedUrl(value: string): boolean {
  const url = new URL(value);
  return url.protocol === "https:" && ["www.instagram.com", "www.facebook.com"].includes(url.hostname);
}
