import { ClientBottomNav } from "@/components/ClientBottomNav";
import { ClientExperienceSlot } from "@/components/ClientExperienceSlot";
import ClientSessionUnavailable from "@/pages/ClientSessionUnavailable";
import { BadgeCheck, CheckCircle2, CircleDot, Clock3, Loader2, MessageCircleMore } from "lucide-react";
import { getAcceptanceStatus, getRequestAcceptanceStatus } from "@/lib/clientAcceptance";
import { getClientSession } from "@/lib/clientSession";
import { trpc } from "@/lib/trpc";
import { useMemo } from "react";
import { useLocation, useRoute } from "wouter";

const experienceStatus = {
  under_review: { index: 1, tone: "amber", description: "يجري فريق المؤسسة مراجعة طلبك." },
  accepted: { index: 2, tone: "emerald", description: "تمت الموافقة المبدئية على طلبك." },
  needs_action: { index: 1, tone: "blue", description: "هناك خطوة مطلوبة لإكمال متابعة الطلب." },
  not_accepted: { index: 2, tone: "slate", description: "تعذر قبول الطلب في مرحلته الحالية." },
} as const;

export default function ClientApplication() {
  const [, params] = useRoute("/client/:publicId/application");
  const publicId = params?.publicId ?? "";
  const [, setLocation] = useLocation();
  const accessToken = useMemo(() => publicId ? getClientSession(publicId) : null, [publicId]);
  const conversationQuery = trpc.support.guestConversation.useQuery({ publicId, accessToken: accessToken ?? "" }, { enabled: Boolean(publicId && accessToken), refetchInterval: 5000 });
  const applicationQuery = trpc.support.guestApplications.useQuery({ publicId, accessToken: accessToken ?? "" }, { enabled: Boolean(publicId && accessToken), refetchInterval: 5000 });
  const experienceQuery = trpc.clientExperience.guestGet.useQuery({ publicId, accessToken: accessToken ?? "" }, { enabled: Boolean(publicId && accessToken), refetchInterval: 5000 });

  if (!accessToken) return <ClientSessionUnavailable />;
  if (conversationQuery.isLoading) return <div className="flex min-h-screen items-center justify-center bg-[#e8efe9]"><Loader2 className="size-7 animate-spin text-[#128c7e]" /></div>;
  if (!conversationQuery.data) return <ClientSessionUnavailable />;

  const request = applicationQuery.data?.requests[0];
  const configured = experienceQuery.data;
  const current = configured?.version ? { ...experienceStatus[configured.acceptanceStatus], title: configured.acceptanceTitle, description: configured.acceptanceNote || experienceStatus[configured.acceptanceStatus].description } : request ? getRequestAcceptanceStatus(request.status) : getAcceptanceStatus(conversationQuery.data.conversation.status);
  const Icon = current.index === 2 ? BadgeCheck : current.index === 1 ? Clock3 : CircleDot;
  const steps = ["استلام الطلب", "مراجعة المؤسسة", "إغلاق المتابعة"];
  const toneClass = current.tone === "emerald" ? "bg-emerald-50 text-emerald-950" : current.tone === "blue" ? "bg-blue-50 text-blue-950" : current.tone === "slate" ? "bg-slate-100 text-slate-900" : "bg-amber-50 text-amber-950";

  return <main className="client-viewport bg-[#e8efe9] p-0" dir="rtl"><section className="client-phone-shell flex flex-col bg-white">
    <header className="client-fixed-header px-5 pb-5 pt-5 text-white" style={{ backgroundColor: configured?.accentColor || "#075e54" }}><h1 className="text-lg font-extrabold">نظام القبول والمتابعة</h1><p className="mt-1 text-xs leading-5 text-white/80">حالة طلبك الحالية مع مؤسسة الوليد بن طلال الإنسانية</p></header>
    <div className="client-scroll-area flex-1 space-y-5 p-5 pb-28 pt-[6.8rem]"><section className={`rounded-3xl p-5 ${toneClass}`}><Icon className="size-9" /><h2 className="mt-4 text-lg font-extrabold">{current.title}</h2><p className="mt-2 text-sm leading-7 opacity-80">{current.description}</p></section><ClientExperienceSlot publicId={publicId} section="application" />{request && <section className="rounded-2xl border border-slate-100 p-4"><p className="text-xs font-bold text-slate-500">الطلب المرتبط</p><p className="mt-1 text-sm font-bold text-slate-900">{request.title}</p><p className="mt-1 text-xs text-slate-400">رقم الطلب: {request.requestNumber}</p></section>}<section className="rounded-2xl border border-slate-100 p-4"><p className="mb-5 text-sm font-bold text-slate-900">مسار الطلب</p><ol className="space-y-5">{steps.map((step, index) => { const complete = index <= current.index; return <li key={step} className="flex items-center gap-3"><span className="flex size-7 shrink-0 items-center justify-center rounded-full text-white" style={{ backgroundColor: complete ? configured?.accentColor || "#128c7e" : "#e2e8f0", color: complete ? "white" : "#94a3b8" }}>{complete ? <CheckCircle2 className="size-4" /> : index + 1}</span><span className={`text-sm ${complete ? "font-bold text-slate-800" : "text-slate-400"}`}>{step}</span></li>; })}</ol></section><section className="flex items-start gap-3 rounded-2xl border border-slate-100 p-4"><MessageCircleMore className="mt-0.5 size-5" style={{ color: configured?.accentColor || "#128c7e" }} /><p className="text-sm leading-6 text-slate-600">تصل تفاصيل الطلب والردود من فريق المؤسسة عبر تبويب خدمة العملاء. لا تعني حالة المراجعة قبولاً نهائياً ما لم يرد تأكيد صريح من المؤسسة.</p></section></div>
    <ClientBottomNav publicId={publicId} active="application" />
  </section></main>;
}
