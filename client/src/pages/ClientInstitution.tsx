import { ClientBottomNav } from "@/components/ClientBottomNav";
import { InstitutionStatusViewer } from "@/components/InstitutionStatusViewer";
import {
  ClientUpdateNotifications,
  CustomerUiPublishedView,
} from "@/components/CustomerUiPublishedView";
import ClientSessionUnavailable from "@/pages/ClientSessionUnavailable";
import { Button } from "@/components/ui/button";
import { getClientSession } from "@/lib/clientSession";
import { brandAssets } from "@/lib/brandAssets";
import {
  hasInstitutionPreload,
  institutionUrl,
  markInstitutionPreloaded,
  primeInstitutionSite,
} from "@/lib/institutionPreload";
import {
  Building2,
  Globe2,
  HeartHandshake,
  RefreshCw,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useRoute } from "wouter";

const logoUrl = brandAssets.institutionSeal;
const institutionName = "خدمة عملاء مؤسسة الوليد بن طلال";
export default function ClientInstitution() {
  const [, params] = useRoute("/client/:publicId/institution");
  const publicId = params?.publicId ?? "";
  const accessToken = useMemo(
    () => (publicId ? getClientSession(publicId) : null),
    [publicId]
  );
  const [view, setView] = useState<"overview" | "website">("website");
  const [frameKey, setFrameKey] = useState(0);
  const [loading, setLoading] = useState(() => !hasInstitutionPreload());

  useEffect(() => {
    primeInstitutionSite();
  }, []);

  if (!accessToken) return <ClientSessionUnavailable />;
  return (
    <main className="h-[100dvh] overflow-hidden bg-[#050807] p-0" dir="rtl">
      <section className="flex h-[100dvh] w-full flex-col overflow-hidden bg-[#080d0c] shadow-2xl">
        <div className="relative overflow-hidden border-b border-[#1c2e27] bg-[#0c1311]">
          <div className="absolute left-3 top-3 z-10 flex items-center gap-1 rounded-full bg-[#07110e]/70 p-1 backdrop-blur">
            <ClientUpdateNotifications publicId={publicId} accessToken={accessToken} />
            {view === "website" && <Button type="button" variant="ghost" size="icon" onClick={() => { setLoading(true); setFrameKey(key => key + 1); }} className="size-8 text-white hover:bg-white/15 hover:text-white" aria-label="تحديث موقع المؤسسة"><RefreshCw className="size-4" /></Button>}
          </div>
          <img src={brandAssets.channelCovers.institution} alt="" aria-hidden="true" className="h-28 w-full object-cover opacity-75" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#07110e] via-[#07110e]/55 to-transparent" />
          <div className="absolute inset-x-4 bottom-3 flex items-end gap-3">
            <img src={logoUrl} alt={institutionName} className="size-16 rounded-2xl border-2 border-white/70 bg-white object-cover shadow-xl" />
            <div className="min-w-0 text-white"><h2 className="truncate text-base font-black">{institutionName}</h2><p className="mt-1 text-xs text-emerald-100/80">ملف رسمي للتواصل ومتابعة الطلبات</p></div>
          </div>
        </div>
        <div className="sticky top-0 z-20 grid grid-cols-2 border-b border-[#1c2e27] bg-[#0c1311] p-2">
          <button
            type="button"
            onClick={() => setView("overview")}
            className={`flex items-center justify-center gap-2 rounded-xl py-2 text-xs font-bold ${view === "overview" ? "bg-[#0e3d32] text-[#63ddb8]" : "text-emerald-100/45"}`}
          >
            <Building2 className="size-4" />
            نبذة
          </button>
          <button
            type="button"
            onClick={() => {
              setLoading(!hasInstitutionPreload());
              setView("website");
            }}
            className={`flex items-center justify-center gap-2 rounded-xl py-2 text-xs font-bold ${view === "website" ? "bg-[#0e3d32] text-[#63ddb8]" : "text-emerald-100/45"}`}
          >
            <Globe2 className="size-4" />
            موقع المؤسسة
          </button>
        </div>
        {view === "overview" ? (
          <div className="flex-1 overflow-y-auto bg-[#080d0c] p-5 pb-[calc(6rem+env(safe-area-inset-bottom))]">
            <CustomerUiPublishedView
              publicId={publicId}
              accessToken={accessToken}
            />
            <InstitutionStatusViewer
              publicId={publicId}
              accessToken={accessToken}
            />
            <section className="rounded-3xl bg-gradient-to-br from-[#075e54] to-[#128c7e] p-5 text-white">
              <HeartHandshake className="size-8 text-emerald-100" />
              <button type="button" onClick={() => window.location.assign(`/client/${publicId}/chat`)} className="mb-5 w-full rounded-2xl bg-[#128c7e] px-4 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-950/30">فتح محادثة خدمة العملاء</button>
            <h2 className="mt-5 text-xl font-extrabold leading-8">
                شركاء في سعي الإنسانية لأجل عالم متكافئ الفرص
              </h2>
              <p className="mt-3 text-sm leading-7 text-emerald-50">
                معاً من أجل الإنسان. تعرف على أعمال المؤسسة ومجالات أثرها من
                داخل التطبيق، أو انتقل إلى تبويب موقع المؤسسة للتصفح الكامل.
              </p>
            </section>
            <section className="mt-5 rounded-2xl border border-[#1e3029] bg-[#101916] p-4"><h3 className="font-bold text-emerald-50">معلومات التواصل</h3><div className="mt-3 space-y-2 text-sm leading-6 text-emerald-100/75"><p dir="ltr" className="text-right">+966-11-211-0000</p><p dir="ltr" className="break-all text-right">General@Alwaleedphilanthropies.Org</p><p>الموقع الرسمي: alwaleedphilanthropies.org</p></div></section><section className="mt-5 rounded-2xl border border-[#1e3029] bg-[#101916] p-4">
              <div className="flex items-start gap-3">
                <Sparkles className="mt-0.5 size-5 text-[#29b78d]" />
                <div>
                  <h3 className="font-bold text-emerald-50">مجالات الأثر</h3>
                  <ul className="mt-3 space-y-2 text-sm leading-6 text-emerald-100/70">
                    <li>تنمية المجتمعات</li>
                    <li>تمكين المرأة والشباب</li>
                    <li>بناء الجسور بين الثقافات</li>
                    <li>مد يد العون عند وقوع الكوارث</li>
                    <li>تنمية البيئة المستدامة</li>
                  </ul>
                </div>
              </div>
            </section>
            <section className="mt-4 rounded-2xl border border-emerald-900/70 bg-[#0b221b] p-4">
              <div className="flex items-start gap-3">
                <ShieldCheck className="mt-0.5 size-5 text-[#29b78d]" />
                <p className="text-sm leading-6 text-emerald-100/80">
                  يمكنك تصفح الموقع الرسمي في التبويب المجاور من داخل التطبيق.
                  لا تُرسل بيانات المحادثة أو الطلب إلى موقع المؤسسة.
                </p>
              </div>
            </section>
          </div>
        ) : (
          <div className="relative min-h-0 flex-1 bg-[#080d0c]">
            {loading && (
              <div className="pointer-events-none absolute inset-0 z-10 flex items-end justify-center bg-transparent pb-4 text-center">
                <p className="rounded-full border border-emerald-800/80 bg-[#0c1713]/90 px-3 py-1.5 text-[11px] text-emerald-100">
                  يُجهّز موقع المؤسسة في الخلفية
                </p>
              </div>
            )}
            <iframe
              key={frameKey}
              title="موقع مؤسسة الوليد بن طلال الإنسانية"
              src={institutionUrl}
              onLoad={() => { markInstitutionPreloaded(); setLoading(false); }}
              className="h-full min-h-[480px] w-full border-0"
              referrerPolicy="strict-origin-when-cross-origin"
            />
          </div>
        )}
        <ClientBottomNav publicId={publicId} active="institution" />
      </section>
    </main>
  );
}
