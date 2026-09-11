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
    orientation: "landscape",
  },
  {
    id: "popup-video-02",
    title: "POP UP – فيديو 2",
    src: "https://drive.google.com/file/d/1u-2ihGnQJiIiX-VR-oi1rVBtA8alqLYv/preview",
    orientation: "portrait",
  },
  {
    id: "popup-video-03",
    title: "POP UP – فيديو 3",
    src: "https://drive.google.com/file/d/1uVYhjjjM4VcIhSrjAVTFHYJ2b1_dZlBC/preview",
    orientation: "portrait",
  },
] as const;

export default function PopupVideos() {
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

        <div className="mx-auto mt-8 grid max-w-5xl gap-5 lg:grid-cols-2">
          {POPUP_VIDEOS.map((video, index) => (
            <article
              key={video.id}
              className={`overflow-hidden rounded-3xl border border-fuchsia-100 bg-white p-3 shadow-[0_16px_45px_rgba(134,25,143,0.08)] ${
                video.orientation === "landscape" ? "lg:col-span-2" : ""
              }`}
            >
              <div className={video.orientation === "portrait" ? "mx-auto max-w-sm" : "w-full"}>
                <div className={`overflow-hidden rounded-2xl bg-black ${video.orientation === "portrait" ? "aspect-[9/16]" : "aspect-video"}`}>
                  <iframe
                    src={video.src}
                    title={video.title}
                    loading="lazy"
                    allow="autoplay; fullscreen"
                    allowFullScreen
                    className="h-full w-full border-0"
                  />
                </div>
              </div>
              <div className="px-2 pb-2 pt-4">
                <p className="text-sm font-black text-brand-ink">فيديو POP UP #{index + 1}</p>
              </div>
            </article>
          ))}
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
