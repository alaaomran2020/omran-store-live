/**
 * إدارة المحتوى — جرد للمحتوى التسويقي الحقيقي المعروض للعملاء (شريط
 * المستجدات، بيانات التواصل، الفروع، الروابط الرسمية) مع تعديل موثّق.
 * المحتوى الحالي مُصدَر في الكود (shared/storeContent.ts)؛ التغيير يُعتمد عبر
 * بوابة الإجراءات الحية فقط — لا يُحفظ وهميًا بالمتصفح ولا تُنشأ حزم TSV تشغيلية.
 */
import { useEffect, useState } from "react";
import { toast, Toaster } from "sonner";
import { Check, Edit3, Megaphone, MapPin, MessageCircle, Share2 } from "lucide-react";
import { AdminPageShell } from "@/admin/shell/AdminPageShell";
import {
  AdminButton,
  Badge,
  Card,
  CardHeader,
  InfoBanner,
  PermissionGate,
  TextAreaField,
  TextInput,
} from "@/admin/components/primitives";
import { useAdminIdentity } from "@/admin/AdminIdentity";
import { useAdminContent } from "@/admin/dataHooks";
import { postAdminAction } from "@/lib/admin/adminGateway";
import { emitAudit } from "@/lib/admin/auditClient";
import {
  CONTENT_SECTION_LABELS_AR,
  POPUP_SOCIAL,
  STORE_ANNOUNCEMENTS,
  STORE_BRANCHES,
  STORE_CONTACT,
  STORE_SOCIAL,
  type StoreContentSection,
} from "@shared/storeContent";



function Section({ id, icon, title, subtitle, children }: { id: string; icon: React.ReactNode; title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader title={title} subtitle={subtitle} icon={icon} />
      <div className="space-y-4 p-5" data-section={id}>
        {children}
      </div>
    </Card>
  );
}

export default function ContentPage() {
  const { actor, can } = useAdminIdentity();
  const contentQuery = useAdminContent();
  const liveContent = contentQuery.data?.status === "live" ? contentQuery.data.data : null;
  const [announcement, setAnnouncement] = useState(STORE_ANNOUNCEMENTS.map(a => a.message).join("\n"));
  const [whatsapp, setWhatsapp] = useState(STORE_CONTACT.whatsapp);
  const [landline, setLandline] = useState(STORE_CONTACT.landline ?? "");
  const [instagram, setInstagram] = useState(STORE_SOCIAL.instagram);
  const [facebook, setFacebook] = useState(STORE_SOCIAL.facebook);

  useEffect(() => {
    if (!liveContent) return;
    setAnnouncement(liveContent.announcements.join("\n"));
    setWhatsapp(liveContent.contact.whatsapp);
    setLandline(liveContent.contact.landline);
    setInstagram(liveContent.social.instagram);
    setFacebook(liveContent.social.facebook);
  }, [liveContent]);

  async function submit(section: StoreContentSection, changes: Record<string, string>) {
    const result = await postAdminAction("content_update", {
      section,
      changes_json: JSON.stringify(changes),
      actor_id: actor.id,
    });
    if (!result.ok) {
      toast.error(`فشل حفظ المحتوى على البوابة الحية: ${result.message}`);
      return;
    }
    emitAudit(actor, {
      action: "CONTENT_UPDATED",
      targetType: "CONTENT",
      targetId: section,
      targetName: CONTENT_SECTION_LABELS_AR[section],
      metadata: { section, fields: Object.keys(changes).join(","), channel: "live_gateway" },
    });
    toast.success("تم حفظ تعديل المحتوى على البوابة الحية");
  }

  const canEdit = can("content:update") && contentQuery.data?.status === "live";
  const branches = liveContent?.branches.length ? liveContent.branches : STORE_BRANCHES;

  return (
    <AdminPageShell title="إدارة المحتوى" subtitle="المحتوى التسويقي المعروض للعملاء حاليًا وقنوات تعديله">
      <Toaster position="top-center" dir="rtl" richColors closeButton />

      <InfoBanner tone={contentQuery.data?.status === "live" ? "info" : "warning"}>
        {contentQuery.data?.status === "live"
          ? "المحتوى مقروء من البوابة الحية، والتعديلات تُحفظ عليها فقط. POP UP يبقى منفصلًا تمامًا."
          : "تعذّر تحميل المحتوى من البوابة الحية؛ القيم الظاهرة مرجع للنسخة الحالية فقط والتعديل متوقف حتى عودة المصدر. لا يوجد fallback تشغيلي إلى TSV/Sheets."}
      </InfoBanner>

      <div className="mt-5 grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Section id="announcements" icon={<Megaphone size={18} />} title="شريط المستجدات" subtitle="رسالة لكل سطر — يظهر فقط الفعّال ضمن نافذته">
          <TextAreaField
            label="رسائل الشريط (سطر لكل رسالة)"
            value={announcement}
            disabled={!canEdit}
            onChange={e => setAnnouncement(e.target.value)}
            className="min-h-32"
          />
          <PermissionGate permission="content:update">
            <AdminButton
              size="sm"
              onClick={() => {
                const lines = announcement.split("\n").map(s => s.trim()).filter(Boolean);
                submit("announcements", { announcements: lines.join(" | ") });
              }}
            >
              <Check size={15} /> اعتماد النصوص
            </AdminButton>
          </PermissionGate>
        </Section>

        <Section id="contact" icon={<MessageCircle size={18} />} title="التواصل والواتساب" subtitle="ما يظهر في الفوتر وأزرار الطلب">
          <TextInput label="رقم واتساب/الموبايل (دولي بلا +)" inputMode="tel" value={whatsapp} disabled={!canEdit} onChange={e => setWhatsapp(e.target.value.replace(/[^\d]/g, ""))} />
          <TextInput label="الهاتف الأرضي (دولي بلا +)" inputMode="tel" value={landline} disabled={!canEdit} onChange={e => setLandline(e.target.value.replace(/[^\d]/g, ""))} />
          <div className="flex items-center gap-2 text-xs font-bold text-brand-muted">
            <Badge tone="green">معروض</Badge>
            زر التواصل عبر واتساب يستخدم الرقم {whatsapp || STORE_CONTACT.whatsapp}
          </div>
          <PermissionGate permission="content:update">
            <AdminButton
              size="sm"
              variant="secondary"
              onClick={() => {
                submit("contact", { whatsapp, landline });
              }}
            >
              <Edit3 size={15} /> اعتماد بيانات التواصل
            </AdminButton>
          </PermissionGate>
        </Section>

        <Section id="social" icon={<Share2 size={18} />} title="الروابط الرسمية — Omran Toys" subtitle="إنستجرام وفيسبوك">
          <TextInput label="إنستجرام" dir="ltr" value={instagram} disabled={!canEdit} onChange={e => setInstagram(e.target.value)} />
          <TextInput label="فيسبوك" dir="ltr" value={facebook} disabled={!canEdit} onChange={e => setFacebook(e.target.value)} />
          <PermissionGate permission="content:update">
            <AdminButton
              size="sm"
              variant="secondary"
              onClick={() => {
                submit("social", { instagram, facebook });
              }}
            >
              <Edit3 size={15} /> اعتماد الروابط
            </AdminButton>
          </PermissionGate>
        </Section>

        <Section id="branches" icon={<MapPin size={18} />} title="الفروع" subtitle="مصدرها الفوتر الحالي">
          <ul className="space-y-2">
            {branches.map(branch => (
              <li key={branch.id} className="rounded-xl border border-brand-border bg-brand-cream/60 p-3">
                <p className="text-sm font-extrabold text-brand-ink">{branch.name}</p>
                <p className="text-xs font-semibold text-brand-muted">{branch.address}</p>
              </li>
            ))}
          </ul>
          <PermissionGate permission="content:update">
            <AdminButton
              size="sm"
              variant="secondary"
              onClick={() => {
                submit("branches", { branches_json: JSON.stringify(branches) });
              }}
            >
              <Check size={15} /> اعتماد بيانات الفروع
            </AdminButton>
          </PermissionGate>
        </Section>
      </div>

      <Card className="mt-4">
        <CardHeader title="POP UP — Gifts & Balloons (محتوى منفصل)" subtitle="لا يُدمج مع Omran Toys أبدًا" />
        <div className="grid grid-cols-1 gap-3 p-5 sm:grid-cols-2">
          <TextInput label="إنستجرام POP UP" dir="ltr" value={POPUP_SOCIAL.instagram} readOnly />
          <TextInput label="فيسبوك POP UP" dir="ltr" value={POPUP_SOCIAL.facebook} readOnly />
        </div>
      </Card>

    </AdminPageShell>
  );
}
