import { useState } from "react";
import { ArrowRight, PlayCircle } from "lucide-react";
import AnnouncementBar from "@/components/AnnouncementBar";
import BrandHeader from "@/components/BrandHeader";
import { SeoMetadata } from "@/components/SeoMetadata";
import SiteFooter from "@/components/SiteFooter";

const POPUP_VIDEOS = [
  {
    id: "popup-video-01",
    title: "POP UP – فيديو 1",
    src: "https://drive.google.com/file/d/1fH97KeIJMwkaNudiLpTO6Yz97ShzrjMA/preview",
    thumbnail: "https://drive.google.com/thumbnail?id=1fH97KeIJMwkaNudiLpTO6Yz97ShzrjMA&sz=w640",
  },
  {
    id: "popup-video-02",
    title: "POP UP – فيديو 2",
    src: "https://drive.google.com/file/d/1u-2ihGnQJiIiX-VR-oi1rVBtA8alqLYv/preview",
    thumbnail: "https://drive.google.com/thumbnail?id=1u-2ihGnQJiIiX-VR-oi1rVBtA8alqLYv&sz=w640",
  },
  {
    id: "popup-video-03",
    title: "POP UP – فيديو 3",
    src: "https://drive.google.com/file/d/1uVYhjjjM4VcIhSrjAVTFHYJ2b1_dZlBC/preview",
    thumbnail: "https://drive.google.com/thumbnail?id=1uVYhjjjM4VcIhSrjAVTFHYJ2b1_dZlBC&sz=w640",
  },
] as const;

export default function PopupVideos() {
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);

  return (
    <div dir="rtl" className="min-h-screen bg-gradient-to-b from-fuchsia-50/60 via-white to-rose-50/40 text-brand-ink">
      <SeoMetadata
        path="/popup/videos"
        title="فيديوهات POP UP – Gifts & Balloons"
        description="شاهد فيديوهات POP UP للهدايا والبالونات وتنسيقات المناسبات."
      />
      <AnnouncementBar />
      <BrandHeader />

      <main className="container py-10 sm:py-14">
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-fuchsia-200 bg-white px-3 py-1.5 text-xs font-black text-fuchsia-700 shadow-sm">
            <PlayCircle size={15} aria-hidden="true" />
            فيديوهات POP UP
          </span>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-brand-ink sm:text-4xl">
            شوف تنسيقات POP UP بالفيديو
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-sm font-semibold leading-7 text-brand-muted sm:text-base">
            فيديوهات حقيقية للهدايا والبالونات وتنسيقات المناسبات من POP UP – Gifts & Balloons.
          </p>
        </div>

        <div className="mx-auto mt-8 grid max-w-6xl gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {POPUP_VIDEOS.map((video, index) => {
            const isActive = activeVideoId === video.id;

            return (
              <article
                key={video.id}
                className="overflow-hidden rounded-3xl border border-fuchsia-100 bg-white p-3 shadow-[0_16px_45px_rgba(134,25,143,0.08)]"
              >
                <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-black">
                  {isActive ? (
                    <iframe
                      src={video.src}
                      title={video.title}
                      loading="lazy"
                      allow="autoplay; fullscreen"
                      allowFullScreen
                      className="h-full w-full border-0"
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => setActiveVideoId(video.id)}
                      className="group relative h-full w-full overflow-hidden text-right focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-fuchsia-300"
                      aria-label={`تشغيل ${video.title}`}
                    >
                      <img
                        src={video.thumbnail}
                        alt={`صورة معاينة ${video.title}`}
                        loading="lazy"
                        className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                      />
                      <span className="absolute inset-0 bg-gradient-to-t from-black/45 via-black/5 to-transparent" aria-hidden="true" />
                      <span className="absolute inset-0 flex items-center justify-center" aria-hidden="true">
                        <span className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-white/95 text-fuchsia-700 shadow-xl transition group-hover:scale-105">
                          <PlayCircle size={36} />
                        </span>
                      </span>
                      <span className="absolute bottom-3 right-3 rounded-full bg-black/60 px-3 py-1.5 text-xs font-black text-white backdrop-blur-sm">
                        اضغط للمشاهدة
                      </span>
                    </button>
                  )}
                </div>

                <div className="px-2 pb-2 pt-4">
                  <p className="text-sm font-black text-brand-ink">فيديو POP UP #{index + 1}</p>
                </div>
              </article>
            );
          })}
        </div>

        <div className="mt-8 flex justify-center">
          <a
            href="/popup"
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-fuchsia-200 bg-white px-5 py-2.5 text-sm font-black text-fuchsia-800 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <ArrowRight size={17} aria-hidden="true" />
            رجوع لصفحة POP UP
          </a>
        </div>
      </main>

      <SiteFooter socialBrand="popup" />
    </div>
  );
}
