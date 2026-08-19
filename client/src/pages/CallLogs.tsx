import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { Loader2, PhoneCall, Radio } from "lucide-react";

const statusLabels = { requested: "مطلوبة", ringing: "تَرِن", connected: "متصلة", ended: "انتهت", failed: "فشلت", cancelled: "ملغاة" };
const formatDate = (value: Date | string) => new Intl.DateTimeFormat("ar-EG", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));

export default function CallLogs() {
  const callsQuery = trpc.calls.list.useQuery(undefined, { refetchInterval: 5000 });
  return (
    <main className="mx-auto max-w-6xl" dir="rtl">
      <header className="rounded-3xl bg-gradient-to-l from-blue-700 via-blue-600 to-blue-500 px-6 py-7 text-white shadow-xl shadow-blue-200"><p className="text-xs font-semibold tracking-[0.16em] text-blue-100">LIVE VOICE</p><h1 className="mt-2 text-2xl font-bold">سجل المكالمات</h1><p className="mt-1 text-sm text-blue-100">تتبّع حالة المكالمات الصوتية المباشرة بين العملاء وفريق الدعم.</p></header>
      <section className="mt-5 overflow-hidden rounded-3xl border border-blue-100 bg-white shadow-sm">
        {callsQuery.isLoading && <div className="flex justify-center p-12"><Loader2 className="size-5 animate-spin text-blue-600" /></div>}
        {!callsQuery.isLoading && callsQuery.data?.length === 0 && <div className="p-12 text-center"><PhoneCall className="mx-auto mb-3 size-9 text-blue-400" /><p className="text-sm text-slate-400">لا توجد مكالمات مسجلة حتى الآن.</p></div>}
        {callsQuery.data?.map(call => { const missed = call.status === "failed" && call.failureReason?.startsWith("مكالمة فائتة"); return <article key={call.id} className="flex flex-col gap-3 border-b border-blue-50 p-5 last:border-0 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-3"><span className="flex size-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-600"><Radio className="size-4" /></span><div><p className="font-bold text-slate-800">مكالمة دعم مباشرة</p><p className="mt-1 text-xs text-slate-400">{formatDate(call.createdAt)} · المحادثة #{call.conversationId ?? "—"}</p>{missed && <p className="mt-1 text-xs text-amber-700">{call.failureReason}</p>}</div></div><div className="flex items-center gap-4"><Badge className={`border-0 hover:bg-transparent ${missed ? "bg-amber-50 text-amber-700" : "bg-blue-50 text-blue-700"}`}>{missed ? "فائتة" : statusLabels[call.status]}</Badge><span className="text-sm text-slate-500">{call.durationSeconds ? `${call.durationSeconds} ثانية` : "—"}</span></div></article>; })}
      </section>
    </main>
  );
}
