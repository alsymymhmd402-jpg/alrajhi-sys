import { ClientBottomNav } from "@/components/ClientBottomNav";
import { InstitutionStatusViewer } from "@/components/InstitutionStatusViewer";
import { ClientUpdateNotifications, CustomerUiPublishedView } from "@/components/CustomerUiPublishedView";
import ClientSessionUnavailable from "@/pages/ClientSessionUnavailable";
import { Button } from "@/components/ui/button";
import { getClientSession } from "@/lib/clientSession";
import { hasInstitutionPreload, institutionUrl } from "@/lib/institutionPreload";
import { Building2, Globe2, HeartHandshake, RefreshCw, ShieldCheck, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { useRoute } from "wouter";

const logoUrl = "/manus-storage/alwaleed-philanthropies-mark_d87d264e.jpg";
export default function ClientInstitution() {
  const [, params] = useRoute("/client/:publicId/institution");
  const publicId = params?.publicId ?? "";
  const accessToken = useMemo(() => publicId ? getClientSession(publicId) : null, [publicId]);
  const [view, setView] = useState<"overview" | "website">("website");
  const [frameKey, setFrameKey] = useState(0);
  const [loading, setLoading] = useState(() => !hasInstitutionPreload());

  if (!accessToken) return <ClientSessionUnavailable />;
  return <main className="min-h-screen bg-[#050807] p-0 sm:p-6" dir="rtl"><section className="mx-auto flex min-h-screen max-w-md flex-col overflow-hidden bg-[#080d0c] shadow-2xl sm:min-h-[760px] sm:rounded-[2rem]">
    <header className="flex items-center justify-between bg-[#075e54] px-4 py-3 text-white"><div className="flex items-center gap-3"><img src={logoUrl} alt="مؤسسة الوليد بن طلال الإنسانية" className="size-10 rounded-xl object-cover" /><div><h1 className="text-sm font-bold">عن المؤسسة</h1><p className="mt-0.5 text-[11px] text-emerald-100">مؤسسة الوليد بن طلال الإنسانية</p></div></div><div className="flex items-center gap-1"><ClientUpdateNotifications publicId={publicId} accessToken={accessToken} />{view === "website" && <Button type="button" variant="ghost" size="icon" onClick={() => { setLoading(true); setFrameKey(key => key + 1); }} className="size-9 text-white hover:bg-white/15 hover:text-white" aria-label="تحديث موقع المؤسسة"><RefreshCw className="size-4" /></Button>}</div></header>
    <div className="grid grid-cols-2 border-b border-[#1c2e27] bg-[#0c1311] p-2"><button type="button" onClick={() => setView("overview")} className={`flex items-center justify-center gap-2 rounded-xl py-2 text-xs font-bold ${view === "overview" ? "bg-[#0e3d32] text-[#63ddb8]" : "text-emerald-100/45"}`}><Building2 className="size-4" />نبذة</button><button type="button" onClick={() => { setLoading(true); setView("website"); }} className={`flex items-center justify-center gap-2 rounded-xl py-2 text-xs font-bold ${view === "website" ? "bg-[#0e3d32] text-[#63ddb8]" : "text-emerald-100/45"}`}><Globe2 className="size-4" />موقع المؤسسة</button></div>
    {view === "overview" ? <div className="flex-1 overflow-y-auto bg-[#080d0c] p-5"><CustomerUiPublishedView publicId={publicId} accessToken={accessToken} /><InstitutionStatusViewer publicId={publicId} accessToken={accessToken} /><section className="rounded-3xl bg-gradient-to-br from-[#075e54] to-[#128c7e] p-5 text-white"><HeartHandshake className="size-8 text-emerald-100" /><h2 className="mt-5 text-xl font-extrabold leading-8">شركاء في سعي الإنسانية لأجل عالم متكافئ الفرص</h2><p className="mt-3 text-sm leading-7 text-emerald-50">معاً من أجل الإنسان. تعرف على أعمال المؤسسة ومجالات أثرها من داخل التطبيق، أو انتقل إلى تبويب موقع المؤسسة للتصفح الكامل.</p></section><section className="mt-5 rounded-2xl border border-[#1e3029] bg-[#101916] p-4"><div className="flex items-start gap-3"><Sparkles className="mt-0.5 size-5 text-[#29b78d]" /><div><h3 className="font-bold text-emerald-50">مجالات الأثر</h3><ul className="mt-3 space-y-2 text-sm leading-6 text-emerald-100/70"><li>تنمية المجتمعات</li><li>تمكين المرأة والشباب</li><li>بناء الجسور بين الثقافات</li><li>مد يد العون عند وقوع الكوارث</li><li>تنمية البيئة المستدامة</li></ul></div></div></section><section className="mt-4 rounded-2xl border border-emerald-900/70 bg-[#0b221b] p-4"><div className="flex items-start gap-3"><ShieldCheck className="mt-0.5 size-5 text-[#29b78d]" /><p className="text-sm leading-6 text-emerald-100/80">يمكنك تصفح الموقع الرسمي في التبويب المجاور من داخل التطبيق. لا تُرسل بيانات المحادثة أو الطلب إلى موقع المؤسسة.</p></div></section></div> : <div className="relative min-h-0 flex-1 bg-[#080d0c]">{loading && <div className="pointer-events-none absolute inset-0 z-10 flex items-end justify-center bg-transparent pb-4 text-center"><p className="rounded-full border border-emerald-800/80 bg-[#0c1713]/90 px-3 py-1.5 text-[11px] text-emerald-100">يُجهّز موقع المؤسسة في الخلفية</p></div>}<iframe key={frameKey} title="موقع مؤسسة الوليد بن طلال الإنسانية" src={institutionUrl} onLoad={() => setLoading(false)} className="h-full min-h-[480px] w-full border-0" referrerPolicy="strict-origin-when-cross-origin" /></div>}
    <ClientBottomNav publicId={publicId} active="institution" />
  </section></main>;
}
