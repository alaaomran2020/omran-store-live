/**
 * إدارة المحتوى — جرد للمحتوى التسويقي الحقيقي المعروض للعملاء (شريط
 * المستجدات، بيانات التواصل، الفروع، الروابط الرسمية) مع تعديل موثّق.
 * المحتوى الحالي مُصدَر في الكود (shared/storeContent.ts)؛ التغيير يُعتمد عبر
 * بوابة الإجراءات إن فُعّلت أو كحزمة تغيير يدوية — لا يُحفظ وهميًا بالمتصفح.
 */
import { useState } from "react";
import { toast, Toaster } from "sonner";
import { Check, Download, Edit3, Megaphone, MapPin, MessageCircle, Share2 } from "lucide-react";
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
import { adminActionsConfigured, postAdminAction } from "@/lib/admin/adminGateway";
import { emitAudit } from "@/lib/admin/auditClient";
import { downloadPacket } from "@/lib/admin/changePackets";
import { safeCsvCell } from "@shared/audit";
import {
  CONTENT_SECTION_LABELS_AR,
  POPUP_SOCIAL,
  STORE_ANNOUNCEMENTS,
  STORE_BRANCHES,
  STORE_CONTACT,
  STORE_SOCIAL,
  type StoreContentSection,
} from "@shared/storeContent";

type ContentPacket = {
  title: string;
  fileName: string;
  headers: string[];
  rows: (string | number)[][];
  notes: string[];
};

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
  const [announcement, setAnnouncement] = useState(STORE_ANNOUNCEMENTS.map(a => a.message).join("\n"));
  const [whatsapp, setWhatsapp] = useState(STORE_CONTACT.whatsapp);
  const [landline, setLandline] = useState(STORE_CONTACT.landline ?? "");
  const [instagram, setInstagram] = useState(STORE_SOCIAL.instagram);
  const [facebook, setFacebook] = useState(STORE_SOCIAL.facebook);
  const directWrite = adminActionsConfigured();

  function packetFor(section: StoreContentSection, rows: (string | number)[][], headers: string[]): ContentPacket {
    return {
      title: CONTENT_SECTION_LABELS_AR[section],
      fileName: `content-${section}-${Date.now()}.tsv`,
      headers,
      rows,
      notes: [`الموظف: ${actor.name}`, "محتوى المتجر مُصدَر في الكود حاليًا: تُعتمد الحزمة عبر المراجعة ثم النشر."],
    };
  }

  async function submit(section: StoreContentSection, packet: ContentPacket, changes: Record<string, string>) {
    const payload = {
      section,
      changes_json: JSON.stringify(changes),
      actor_id: actor.id,
    };
    if (directWrite) {
      const result = await postAdminAction("content_update", payload);
      if (result.ok) {
        toast.success("تم إرسال تعديل المحتوى للاعتماد");
      } else {
        downloadPacket(packet);
        toast.warning("البوابة المباشرة غير متاحة — تم تنزيل حزمة التغيير");
      }
    } else {
      downloadPacket(packet);
      toast.success("تم إصدار حزمة تعديل المحتوى للاعتماد اليدوي");
    }
    emitAudit(actor, {
      action: "CONTENT_UPDATED",
      targetType: "CONTENT",
      targetId: section,
      targetName: CONTENT_SECTION_LABELS_AR[section],
      metadata: { section, fields: Object.keys(changes).join(",") },
    });
  }

  const canEdit = can("content:update");

  return (
    <AdminPageShell title="إدارة المحتوى" subtitle="المحتوى التسويقي المعروض للعملاء حاليًا وقنوات تعديله">
      <Toaster position="top-center" dir="rtl" richColors closeButton />

      <InfoBanner tone="info">
        المحتوى الحالي مُصدَر ضمن حزمة المتجر (shared/storeContent.ts) ويصل للعملاء فور نشر النسخة. التعديلات هنا إما تُرسل
        لبوابة الاعتماد إن فُعّلت ({directWrite ? "مفعّلة الآن" : "غير مفعّلة"}) أو تُصدَّر كحزمة تغيير للصق والمراجعة. لا تُحفظ
        تغييرات وهمية في المتصفح. POP UP يبقى محتوى منفصلًا تمامًا.
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
                submit(
                  "announcements",
                  packetFor("announcements", lines.map((message, i) => [i + 1, message, "TRUE"]), ["row", "message", "active"]),
                  { announcements: lines.join(" | ") }
                );
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
            زر التواصل عبر واتساب يستخدم الرقم {STORE_CONTACT.whatsapp}
          </div>
          <PermissionGate permission="content:update">
            <AdminButton
              size="sm"
              variant="secondary"
              onClick={() => {
                const packet = packetFor("contact", [["whatsapp", whatsapp], ["landline", landline]], ["key", "value"]);
                submit("contact", packet, { whatsapp, landline });
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
                const packet = packetFor("social", [["instagram", instagram], ["facebook", facebook]], ["key", "value"]);
                submit("social", packet, { instagram, facebook });
              }}
            >
              <Edit3 size={15} /> اعتماد الروابط
            </AdminButton>
          </PermissionGate>
        </Section>

        <Section id="branches" icon={<MapPin size={18} />} title="الفروع" subtitle="مصدرها الفوتر الحالي">
          <ul className="space-y-2">
            {STORE_BRANCHES.map(branch => (
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
                const packet = packetFor(
                  "branches",
                  STORE_BRANCHES.map(b => [b.id, b.name, b.address, b.city] as (string | number)[]),
                  ["id", "name", "address", "city"]
                );
                submit("branches", packet, { branches: STORE_BRANCHES.length.toString() });
              }}
            >
              <Download size={15} /> إصدار حزمة الفروع
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

      <p className="mt-4 text-[11px] font-semibold text-brand-disabled">
        جميع الحزم TSV محصّنة ضد حقن الصيغ ({safeCsvCell("=cmd")}) ولا تكتب إلا من موظف بصلاحية content:update.
      </p>
    </AdminPageShell>
  );
}
