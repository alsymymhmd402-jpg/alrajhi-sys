import { ClientBottomNav } from "@/components/ClientBottomNav";
import ClientSessionUnavailable from "@/pages/ClientSessionUnavailable";
import { BadgeCheck, CheckCircle2, CircleDot, Clock3, Loader2, MessageCircleMore } from "lucide-react";
import { getAcceptanceStatus } from "@/lib/clientAcceptance";
import { getClientSession } from "@/lib/clientSession";
import { trpc } from "@/lib/trpc";
import { useMemo } from "react";
import { useRoute } from "wouter";

export default function ClientApplication() {
  const [, params] = useRoute("/client/:publicId/application");
  const publicId = params?.publicId ?? "";
  const accessToken = useMemo(() => publicId ? getClientSession(publicId) : null, [publicId]);
  const conversationQuery = trpc.support.guestConversation.useQuery({ publicId, accessToken: accessToken ?? "" }, { enabled: Boolean(publicId && accessToken), refetchInterval: 5000 });
  if (!accessToken) return <ClientSessionUnavailable />;
  if (conversationQuery.isLoading) return <div className="flex min-h-screen items-center justify-center bg-[#e8efe9]"><Loader2 className="size-7 animate-spin text-[#128c7e]" /></div>;
  if (!conversationQuery.data) return <ClientSessionUnavailable />;
  const current = getAcceptanceStatus(conversationQuery.data.conversation.status);
  const Icon = current.index === 2 ? BadgeCheck : current.index === 1 ? Clock3 : CircleDot;
  const steps = ["استلام الطلب", "مراجعة المؤسسة", "إغلاق المتابعة"];
  return <main className="min-h-screen bg-[#e8efe9] p-0 sm:p-6" dir="rtl"><section className="mx-auto flex min-h-screen max-w-md flex-col overflow-hidden bg-white shadow-2xl sm:min-h-[760px] sm:rounded-[2rem]">
    <header className="bg-[#075e54] px-5 pb-5 pt-5 text-white"><h1 className="text-lg font-extrabold">نظام القبول والمتابعة</h1><p className="mt-1 text-xs leading-5 text-emerald-100">حالة طلبك الحالية مع مؤسسة الوليد بن طلال الإنسانية</p></header>
    <div className="flex-1 space-y-5 p-5"><section className={`rounded-3xl p-5 ${current.tone === "emerald" ? "bg-emerald-50 text-emerald-950" : current.tone === "blue" ? "bg-blue-50 text-blue-950" : "bg-amber-50 text-amber-950"}`}><Icon className="size-9" /><h2 className="mt-4 text-lg font-extrabold">{current.title}</h2><p className="mt-2 text-sm leading-7 opacity-80">{current.description}</p></section><section className="rounded-2xl border border-slate-100 p-4"><p className="mb-5 text-sm font-bold text-slate-900">مسار الطلب</p><ol className="space-y-5">{steps.map((step, index) => { const complete = index <= current.index; return <li key={step} className="flex items-center gap-3"><span className={`flex size-7 shrink-0 items-center justify-center rounded-full ${complete ? "bg-[#128c7e] text-white" : "bg-slate-100 text-slate-400"}`}>{complete ? <CheckCircle2 className="size-4" /> : index + 1}</span><span className={`text-sm ${complete ? "font-bold text-slate-800" : "text-slate-400"}`}>{step}</span></li>; })}</ol></section><section className="flex items-start gap-3 rounded-2xl border border-slate-100 p-4"><MessageCircleMore className="mt-0.5 size-5 text-[#128c7e]" /><p className="text-sm leading-6 text-slate-600">تصل تفاصيل الطلب والردود من فريق المؤسسة عبر تبويب خدمة العملاء. لا تعني حالة المراجعة قبولاً نهائياً ما لم يرد تأكيد صريح من المؤسسة.</p></section></div>
    <ClientBottomNav publicId={publicId} active="application" />
  </section></main>;
}
