import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { OfficialSocialEmbeds } from "@/components/OfficialSocialEmbeds";
import { SOCIAL_EMBED_CONFIG } from "@/lib/socialEmbeds";
import {
  fetchSocialFeed,
  type SocialPost,
  type SocialSource,
} from "@/lib/socialFeedClient";
import { shareProductsPage, type ProductShareOutcome } from "@/lib/productShare";
import {
  ExternalLink,
  Facebook,
  Images,
  Instagram,
  MessageCircle,
  RefreshCw,
  Search,
  Share2,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

const dateFormatter = new Intl.DateTimeFormat("ar-EG", { dateStyle: "long" });

const formatDate = (iso: string) => {
  const t = Date.parse(iso);
  return Number.isFinite(t) && t > 0 ? dateFormatter.format(new Date(t)) : "";
};

/** أول سطر غير فارغ من نص المنشور = اسم المنتج على البطاقة. */
const titleOf = (message: string): string => {
  const line = message
    .split("\n")
    .map(l => l.trim())
    .find(l => l.length > 0);
  return line ?? "منشور من متجرنا";
};

const bodyOf = (message: string): string => {
  const lines = message.split("\n").map(l => l.trim());
  const start = lines.findIndex(l => l.length > 0);
  return start === -1 ? "" : lines.slice(start + 1).filter(Boolean).join(" · ");
};

const SOURCE_META: Record<SocialSource, { label: string; color: string; Icon: typeof Facebook }> = {
  facebook: { label: "Facebook", color: "#1877f2", Icon: Facebook },
  instagram: { label: "Instagram", color: "#d62976", Icon: Instagram },
};

function whatsappOrderUrl(post: SocialPost): string | null {
  const num = SOCIAL_EMBED_CONFIG.whatsappNumber;
  if (!num) return null;
  const text = `مرحبًا، أريد الاستفسار عن هذا المنتج:\n${titleOf(post.message)}\n${post.permalink}`;
  return `https://wa.me/${num}?text=${encodeURIComponent(text)}`;
}

function ProductCard({ post }: { post: SocialPost }) {
  const { label, color, Icon } = SOURCE_META[post.source];
  const waUrl = whatsappOrderUrl(post);
  const title = titleOf(post.message);
  const body = bodyOf(post.message);

  return (
    <article className="group flex flex-col overflow-hidden rounded-[1.75rem] border border-stone-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
      <a
        href={post.permalink}
        target="_blank"
        rel="noreferrer"
        className="relative block aspect-square overflow-hidden bg-stone-100"
        aria-label={`فتح المنشور الأصلي على ${label}`}
      >
        {post.image ? (
          <img
            src={post.image}
            alt={title}
            loading="lazy"
            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_30%_20%,#d1fae5,transparent_55%),linear-gradient(135deg,#f7f3ec,#ffffff)]">
            <Icon size={44} style={{ color }} aria-hidden="true" />
          </div>
        )}
        <span
          className="absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-black text-white shadow"
          style={{ backgroundColor: color }}
        >
          <Icon size={13} aria-hidden="true" /> {label}
        </span>
        {post.images.length > 1 && (
          <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-black/60 px-2.5 py-1 text-xs font-bold text-white">
            <Images size={13} aria-hidden="true" /> {post.images.length}
          </span>
        )}
      </a>
      <div className="flex flex-1 flex-col gap-3 p-5">
        <h3 className="line-clamp-2 text-lg font-black leading-8 text-emerald-950">{title}</h3>
        {body && <p className="line-clamp-3 text-sm leading-7 text-stone-600">{body}</p>}
        {formatDate(post.timestamp) && (
          <p className="text-xs font-bold text-stone-400">{formatDate(post.timestamp)}</p>
        )}
        <div className="mt-auto flex flex-col gap-2 pt-2">
          {waUrl && (
            <a
              href={waUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-[#25d366] px-4 py-2.5 text-sm font-black text-white transition hover:bg-[#1eb857]"
            >
              <MessageCircle size={17} aria-hidden="true" /> اطلب عبر واتساب
            </a>
          )}
          <a
            href={post.permalink}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-stone-300 px-4 py-2.5 text-sm font-bold text-emerald-900 transition hover:border-emerald-700 hover:bg-emerald-50"
          >
            عرض المنشور الأصلي <ExternalLink size={15} aria-hidden="true" />
          </a>
        </div>
      </div>
    </article>
  );
}

function CardSkeleton() {
  return (
    <div className="animate-pulse overflow-hidden rounded-[1.75rem] border border-stone-200 bg-white">
      <div className="aspect-square bg-stone-200/70" />
      <div className="space-y-3 p-5">
        <div className="h-5 w-3/4 rounded-full bg-stone-200/70" />
        <div className="h-4 w-full rounded-full bg-stone-200/60" />
        <div className="h-11 w-full rounded-2xl bg-stone-200/50" />
      </div>
    </div>
  );
}

export default function Products() {
  const [shareOutcome, setShareOutcome] = useState<ProductShareOutcome | null>(null);
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState<SocialSource | "all">("all");

  const feedQuery = useQuery({
    queryKey: ["social-feed"],
    queryFn: ({ signal }) => fetchSocialFeed(signal),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const posts = feedQuery.data?.posts ?? [];
  const sources = feedQuery.data?.sources;
  const configured =
    sources && (sources.facebook !== "not_configured" || sources.instagram !== "not_configured");
  const partialError =
    sources && (sources.facebook === "error" || sources.instagram === "error");

  const visiblePosts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return posts.filter(post => {
      if (sourceFilter !== "all" && post.source !== sourceFilter) return false;
      if (q && !post.message.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [posts, search, sourceFilter]);

  const handleShare = async () => {
    const nativeShare = typeof navigator !== "undefined" && navigator.share
      ? navigator.share.bind(navigator)
      : undefined;
    const copyToClipboard = typeof navigator !== "undefined" && navigator.clipboard
      ? navigator.clipboard.writeText.bind(navigator.clipboard)
      : undefined;

    setShareOutcome(await shareProductsPage({
      url: window.location.href,
      nativeShare,
      copyToClipboard,
    }));
  };

  const shareMessage = {
    shared: "تم فتح خيارات المشاركة.",
    copied: "تم نسخ رابط الصفحة.",
    dismissed: "تم إلغاء المشاركة.",
    unavailable: "تعذر النسخ تلقائياً؛ يمكنك نسخ الرابط من شريط العنوان.",
  } as const;

  const filterChip = (value: SocialSource | "all", label: string) => (
    <button
      key={value}
      type="button"
      onClick={() => setSourceFilter(value)}
      aria-pressed={sourceFilter === value}
      className={`min-h-10 rounded-full px-4 py-2 text-sm font-bold transition ${
        sourceFilter === value
          ? "bg-emerald-900 text-white shadow"
          : "border border-stone-300 text-stone-600 hover:border-emerald-700 hover:text-emerald-800"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div dir="rtl" className="min-h-screen bg-[#f7f3ec] text-stone-900">
      <header className="border-b border-stone-200/80 bg-[#f7f3ec]/90 backdrop-blur">
        <div className="container flex min-h-20 items-center justify-between gap-4">
          <a href="/products" className="text-xl font-black tracking-tight text-emerald-950">عمران للألعاب</a>
          <nav className="flex items-center gap-4 text-sm font-bold text-stone-600"><a href="#feed" className="hover:text-emerald-800">المنتجات</a><a href="/settings/social" className="inline-flex items-center gap-1.5 rounded-full border border-stone-300 px-3 py-1.5 hover:border-emerald-700 hover:text-emerald-800"><ShieldCheck size={15} /> الإعدادات</a></nav>
        </div>
      </header>
      <main>
        <section className="container grid gap-10 py-14 lg:grid-cols-[1.1fr_.9fr] lg:items-end lg:py-20">
          <div><span className="inline-flex items-center gap-2 rounded-full bg-orange-100 px-3 py-1.5 text-xs font-bold text-orange-900"><Sparkles size={15} /> مزامنة تلقائية من المنصات الرسمية</span><h1 className="mt-5 max-w-3xl text-4xl font-black leading-[1.15] text-emerald-950 sm:text-6xl">منتجاتنا مباشرة من <span className="text-orange-700">Instagram وFacebook</span></h1><p className="mt-5 max-w-2xl text-lg leading-8 text-stone-600">كل منشور ننشره على صفحاتنا الرسمية يظهر هنا تلقائيًا كبطاقة منتج — بلا نسخ يدوي وبلا قاعدة بيانات محلية للمحتوى.</p><div className="mt-6"><button type="button" onClick={handleShare} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-emerald-900 px-5 py-3 text-sm font-bold text-white shadow-lg transition hover:bg-emerald-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-300 active:scale-[0.97]"><Share2 size={18} aria-hidden="true" /> مشاركة المنتجات</button><p aria-live="polite" className="mt-3 min-h-5 text-sm font-semibold text-emerald-900">{shareOutcome ? shareMessage[shareOutcome] : ""}</p></div></div>
          <div className="rounded-[2rem] bg-emerald-950 p-7 text-emerald-50 shadow-xl"><p className="text-sm font-bold text-emerald-200">معلومة مهمة</p><p className="mt-3 text-xl font-bold leading-8">المحتوى يُجلب من Meta عبر الواجهة الرسمية ويُحدَّث تلقائيًا كل بضع دقائق. رموز الوصول تبقى على الخادم ولا تصل إلى المتصفح أبدًا.</p></div>
        </section>

        <section id="feed" className="border-t border-stone-200 bg-white py-14">
          <div className="container">
            <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-sm font-bold text-orange-700">مزامنة تلقائية عند تحميل الصفحة</p>
                <h2 className="mt-1 text-3xl font-black text-emerald-950">كتالوج المنتجات</h2>
              </div>
              <button
                type="button"
                onClick={() => feedQuery.refetch()}
                className="inline-flex min-h-10 items-center gap-2 rounded-full border border-stone-300 px-4 py-2 text-sm font-bold text-emerald-900 transition hover:border-emerald-700"
              >
                <RefreshCw size={15} className={feedQuery.isFetching ? "animate-spin" : ""} /> تحديث
              </button>
            </div>

            {posts.length > 0 && (
              <div className="mb-8 flex flex-wrap items-center gap-3">
                <label className="relative min-w-[230px] flex-1 sm:max-w-sm">
                  <Search size={17} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-stone-400" aria-hidden="true" />
                  <input
                    type="search"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="ابحث في المنتجات…"
                    className="min-h-11 w-full rounded-full border border-stone-300 bg-white py-2.5 pl-4 pr-11 text-sm font-semibold text-stone-800 outline-none transition focus:border-emerald-700 focus:ring-4 focus:ring-emerald-100"
                  />
                </label>
                <div className="flex items-center gap-2">
                  {filterChip("all", "الكل")}
                  {filterChip("instagram", "Instagram")}
                  {filterChip("facebook", "Facebook")}
                </div>
              </div>
            )}

            {partialError && posts.length > 0 && (
              <p className="mb-6 rounded-2xl border border-orange-200 bg-orange-50 px-5 py-3 text-sm font-bold text-orange-900">
                تعذر الوصول إلى إحدى المنصتين مؤقتًا؛ نعرض المنشورات المتاحة الآن وسيكتمل العرض تلقائيًا عند عودتها.
              </p>
            )}

            {feedQuery.isLoading ? (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {Array.from({ length: 8 }).map((_, i) => <CardSkeleton key={i} />)}
              </div>
            ) : feedQuery.isError ? (
              <div className="rounded-[2rem] border border-stone-200 bg-stone-50 p-10 text-center">
                <p className="text-xl font-black text-emerald-950">تعذر تحميل المنتجات الآن</p>
                <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-stone-600">حدث خطأ مؤقت أثناء الاتصال بالخادم. حاول مرة أخرى، أو تابعنا مباشرة على المنصات الرسمية بالأسفل.</p>
                <button type="button" onClick={() => feedQuery.refetch()} className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-full bg-emerald-900 px-6 py-3 text-sm font-bold text-white hover:bg-emerald-800"><RefreshCw size={16} /> إعادة المحاولة</button>
                <div className="mt-10 text-right"><OfficialSocialEmbeds /></div>
              </div>
            ) : posts.length === 0 ? (
              <div className="space-y-10">
                <div className="rounded-[2rem] border border-emerald-100 bg-emerald-50/60 p-10 text-center">
                  <span className="inline-flex rounded-2xl bg-emerald-100 p-4 text-emerald-900"><Sparkles size={30} aria-hidden="true" /></span>
                  <p className="mt-5 text-2xl font-black text-emerald-950">المتجر قيد التجهيز — المنتجات قادمة قريبًا</p>
                  <p className="mx-auto mt-3 max-w-lg text-sm leading-7 text-stone-600">
                    {configured
                      ? "بمجرد نشر أول منشور على صفحاتنا الرسمية سيظهر هنا تلقائيًا كبطاقة منتج."
                      : "لم تُفعَّل المزامنة بعد. بعد إضافة رموز الوصول على الخادم ستظهر منشورات Facebook وInstagram هنا تلقائيًا."}
                  </p>
                </div>
                <OfficialSocialEmbeds />
              </div>
            ) : (
              <>
                <p className="mb-6 text-sm font-bold text-stone-500">{visiblePosts.length} من {posts.length} منتجًا</p>
                {visiblePosts.length === 0 ? (
                  <div className="rounded-[2rem] border border-stone-200 bg-stone-50 p-10 text-center">
                    <p className="text-lg font-black text-emerald-950">لا توجد نتائج مطابقة لبحثك</p>
                    <button type="button" onClick={() => { setSearch(""); setSourceFilter("all"); }} className="mt-4 inline-flex min-h-10 items-center rounded-full border border-stone-300 px-5 py-2 text-sm font-bold text-emerald-900 hover:border-emerald-700">مسح البحث والفلاتر</button>
                  </div>
                ) : (
                  <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {visiblePosts.map(post => <ProductCard key={post.id} post={post} />)}
                  </div>
                )}
              </>
            )}
          </div>
        </section>

        {posts.length > 0 && (
          <section className="border-t border-stone-200 bg-[#f7f3ec] py-10">
            <div className="container flex flex-wrap items-center justify-between gap-4">
              <p className="text-sm font-bold text-stone-600">تابعنا على المنصات الرسمية:</p>
              <div className="flex flex-wrap items-center gap-3">
                <a href={SOCIAL_EMBED_CONFIG.instagramProfileUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center gap-2 rounded-full border border-pink-200 bg-white px-4 py-2 text-sm font-bold text-[#b0195e] hover:border-[#d62976]"><Instagram size={16} /> Instagram</a>
                <a href={SOCIAL_EMBED_CONFIG.facebookPageUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center gap-2 rounded-full border border-blue-200 bg-white px-4 py-2 text-sm font-bold text-[#1877f2] hover:border-[#1877f2]"><Facebook size={16} /> Facebook</a>
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
