import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { AlertTriangle, ArrowLeft, Bot, CheckCircle2, CircleAlert, Clock3, Loader2, RefreshCw, ShieldCheck, Wrench } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

type AlertStatus = "open" | "dismissed" | "resolved" | "all";

const statusLabels: Record<Exclude<AlertStatus, "all">, string> = {
  open: "بانتظار المراجعة",
  dismissed: "أُغلق من دون إجراء",
  resolved: "تمت المعالجة",
};
const severityLabels = { error: "خطأ", warning: "تنبيه", info: "معلومة" } as const;
const formatDate = (value: Date | string) => new Intl.DateTimeFormat("ar-EG", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));

export default function AgentErrorRoom() {
  const [, setLocation] = useLocation();
  const [status, setStatus] = useState<AlertStatus>("open");
  const [reviewingId, setReviewingId] = useState<number | null>(null);
  const alertsQuery = trpc.agent.alerts.useQuery({ status }, { refetchInterval: 5000 });
  const createThread = trpc.agent.createThread.useMutation();
  const send = trpc.agent.send.useMutation();
  const alerts = alertsQuery.data ?? [];
  const summary = useMemo(() => ({ open: alerts.filter(alert => alert.status === "open").length, errors: alerts.filter(alert => alert.severity === "error").length, resolved: alerts.filter(alert => alert.status === "resolved").length }), [alerts]);

  const startReview = async (alert: typeof alerts[number]) => {
    try {
      setReviewingId(alert.id);
      const thread = await createThread.mutateAsync({ title: `مراجعة خطأ: ${alert.title.slice(0, 120)}` });
      await send.mutateAsync({ threadId: thread.id, message: `راجع التنبيه التشغيلي التالي كوكيل معالجة أخطاء. اشرح السبب المحتمل، وحدد أثره، ثم أنشئ بطاقة معاينة لإصلاح آمن لا ينفذ إلا بعد موافقتي.\n\nالعنوان: ${alert.title}\nالتفاصيل: ${alert.detail}\nالمصدر: ${alert.source}\nالشدة: ${severityLabels[alert.severity]}` });
      toast.success("أُنشئت مراجعة الذكاء الاصطناعي. راجع بطاقة المعاينة ثم وافق أو ألغِ.");
      setLocation("/dashboard/app-agent");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذر بدء مراجعة الخطأ.");
    } finally {
      setReviewingId(null);
    }
  };

  return <main className="mx-auto max-w-7xl space-y-5" dir="rtl">
    <header className="overflow-hidden rounded-3xl bg-[radial-gradient(circle_at_86%_12%,rgba(245,158,11,.34),transparent_28%),linear-gradient(135deg,#1e293b,#0f172a)] px-6 py-7 text-white shadow-xl shadow-slate-200">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between"><div><p className="text-xs font-bold tracking-[.16em] text-amber-200">AI REPAIR ROOM</p><h1 className="mt-2 text-2xl font-extrabold">غرفة معالجة أخطاء التطبيق</h1><p className="mt-2 max-w-2xl text-sm leading-7 text-slate-300">تجمع التنبيهات التشغيلية، تشرحها للوكيل، ثم تعرض بطاقة إصلاح لا تُنفذ إلا بعد موافقتك داخل وكيل التطبيق.</p></div><Button variant="secondary" onClick={() => setLocation("/dashboard/app-agent")} className="rounded-xl"><Bot className="ml-2 size-4" />فتح وكيل التطبيق</Button></div>
    </header>

    <section className="grid gap-4 sm:grid-cols-3"><SummaryCard icon={<CircleAlert className="size-5 text-amber-600" />} label="تنبيهات معروضة" value={alerts.length} tone="amber" /><SummaryCard icon={<AlertTriangle className="size-5 text-rose-600" />} label="أخطاء عالية الأولوية" value={summary.errors} tone="rose" /><SummaryCard icon={<CheckCircle2 className="size-5 text-emerald-600" />} label="تمت معالجتها" value={summary.resolved} tone="emerald" /></section>

    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"><div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="font-extrabold text-slate-900">سجل التنبيهات</h2><p className="mt-1 text-xs text-slate-500">اختر تنبيهاً ليُنشئ الوكيل تحليلاً وبطاقة معاينة قابلة للموافقة.</p></div><div className="flex flex-wrap gap-2">{(["open", "resolved", "dismissed", "all"] as const).map(item => <Button key={item} size="sm" variant={status === item ? "default" : "outline"} onClick={() => setStatus(item)} className={status === item ? "rounded-lg bg-slate-800 hover:bg-slate-900" : "rounded-lg"}>{item === "all" ? "الكل" : statusLabels[item]}</Button>)}<Button size="icon" variant="outline" onClick={() => alertsQuery.refetch()} className="size-9 rounded-lg" aria-label="تحديث التنبيهات"><RefreshCw className={`size-4 ${alertsQuery.isFetching ? "animate-spin" : ""}`} /></Button></div></div>
      {alertsQuery.isLoading ? <div className="flex justify-center p-14"><Loader2 className="size-6 animate-spin text-slate-600" /></div> : !alerts.length ? <div className="p-14 text-center"><ShieldCheck className="mx-auto mb-3 size-10 text-emerald-500" /><h3 className="font-bold text-slate-800">لا توجد تنبيهات في هذه الحالة</h3><p className="mt-1 text-sm text-slate-400">ستظهر أخطاء الواجهة والخادم التي تُرصد داخل التطبيق هنا.</p></div> : <div className="divide-y divide-slate-100">{alerts.map(alert => <article key={alert.id} className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><Badge className={`border-0 ${alert.severity === "error" ? "bg-rose-100 text-rose-700" : alert.severity === "warning" ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"}`}>{severityLabels[alert.severity]}</Badge><Badge variant="outline" className="border-slate-200 text-slate-600">{statusLabels[alert.status]}</Badge><span className="flex items-center gap-1 text-[11px] text-slate-400"><Clock3 className="size-3" />{formatDate(alert.createdAt)}</span></div><h3 className="mt-3 font-bold text-slate-900">{alert.title}</h3><p className="mt-2 max-w-3xl text-sm leading-7 text-slate-600">{alert.detail}</p><p className="mt-2 text-xs text-slate-400">المصدر: {alert.source}</p></div>{alert.status === "open" ? <Button onClick={() => startReview(alert)} disabled={reviewingId !== null} className="shrink-0 rounded-xl bg-amber-600 hover:bg-amber-700"><Wrench className="ml-2 size-4" />{reviewingId === alert.id ? "جارٍ تجهيز المراجعة…" : "تحليل وإصلاح بالموافقة"}</Button> : <Button variant="outline" onClick={() => setLocation("/dashboard/app-agent")} className="shrink-0 rounded-xl"><ArrowLeft className="ml-2 size-4" />عرض سجل الوكيل</Button>}</article>)}</div>}</section>
  </main>;
}

function SummaryCard({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: number; tone: "amber" | "rose" | "emerald" }) {
  const backgrounds = { amber: "border-amber-100 bg-amber-50/50", rose: "border-rose-100 bg-rose-50/50", emerald: "border-emerald-100 bg-emerald-50/50" };
  return <article className={`rounded-2xl border p-4 ${backgrounds[tone]}`}><div className="flex items-center justify-between">{icon}<span className="text-2xl font-black text-slate-900">{value}</span></div><p className="mt-3 text-sm font-bold text-slate-700">{label}</p></article>;
}
