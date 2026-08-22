import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { AlertTriangle, BrainCircuit, CheckCircle2, Clock3, FileCode2, Loader2, Plus, Send, ShieldCheck, Sparkles, Wrench, X } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { Streamdown } from "streamdown";
import { toast } from "sonner";

const actionLabels = { update_setting: "تحديث إعداد مسموح", acknowledge_alert: "معالجة تنبيه", manual_development: "طلب تطوير" } as const;
const statusLabels = { draft: "بانتظار موافقتك", approved: "تمت الموافقة", cancelled: "أُلغي", executed: "طُبّق", failed: "تعذر التنفيذ" } as const;

function formatDate(value: Date | string) {
  return new Intl.DateTimeFormat("ar-EG", { hour: "numeric", minute: "2-digit", day: "numeric", month: "short" }).format(new Date(value));
}

export default function AgentConsole() {
  const utils = trpc.useUtils();
  const [activeThreadId, setActiveThreadId] = useState<number | null>(null);
  const [input, setInput] = useState("");
  const [executingProposalId, setExecutingProposalId] = useState<number | null>(null);
  const [executionStartedAt, setExecutionStartedAt] = useState<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const threadsQuery = trpc.agent.threads.useQuery(undefined, { refetchInterval: 5000 });
  const workspaceQuery = trpc.agent.workspace.useQuery({ id: activeThreadId ?? 0 }, { enabled: Boolean(activeThreadId), refetchInterval: 3000 });
  const createThread = trpc.agent.createThread.useMutation({
    onSuccess: thread => { utils.agent.threads.invalidate(); setActiveThreadId(thread.id); toast.success("بدأت محادثة جديدة مع وكيل التطبيق."); },
    onError: error => toast.error(error.message),
  });
  const send = trpc.agent.send.useMutation({
    onSuccess: () => { setInput(""); utils.agent.workspace.invalidate(); utils.agent.threads.invalidate(); },
    onError: error => toast.error(error.message),
  });
  const approve = trpc.agent.approve.useMutation({
    onSuccess: result => {
      utils.agent.workspace.invalidate();
      const proposalId = result.proposal?.id;
      if (result.readyToExecute && proposalId) {
        setExecutingProposalId(proposalId);
        setExecutionStartedAt(Date.now());
        execute.mutate({ id: proposalId });
      }
      if (result.pendingManualWork) toast.message(result.result);
    },
    onError: error => toast.error(error.message),
  });
  const execute = trpc.agent.execute.useMutation({
    onSuccess: result => { setExecutingProposalId(null); setExecutionStartedAt(null); utils.agent.workspace.invalidate(); toast.success(result.result); },
    onError: error => { setExecutingProposalId(null); setExecutionStartedAt(null); utils.agent.workspace.invalidate(); toast.error(error.message); },
  });
  const cancel = trpc.agent.cancel.useMutation({
    onSuccess: () => { utils.agent.workspace.invalidate(); toast.message("أُلغي الاقتراح ولم يُطبّق أي تغيير."); },
    onError: error => toast.error(error.message),
  });

  useEffect(() => {
    if (!activeThreadId && threadsQuery.data?.[0]) setActiveThreadId(threadsQuery.data[0].id);
  }, [activeThreadId, threadsQuery.data]);

  useEffect(() => {
    if (!executionStartedAt) { setElapsedSeconds(0); return; }
    const tick = () => setElapsedSeconds(Math.max(1, Math.floor((Date.now() - executionStartedAt) / 1000)));
    tick();
    const timer = window.setInterval(tick, 250);
    return () => window.clearInterval(timer);
  }, [executionStartedAt]);

  const proposalsById = useMemo(() => new Map((workspaceQuery.data?.proposals ?? []).map(proposal => [proposal.id, proposal])), [workspaceQuery.data?.proposals]);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!activeThreadId || !input.trim() || send.isPending) return;
    send.mutate({ threadId: activeThreadId, message: input.trim() });
  };
  const startErrorReview = () => {
    const alert = workspaceQuery.data?.alerts.find(item => item.severity === "error") ?? workspaceQuery.data?.alerts[0];
    if (!alert) return toast.message("لا يوجد تنبيه مفتوح لمراجعته حالياً.");
    const request = `راجع هذا التنبيه التشغيلي وفسّره واقترح إصلاحاً آمناً للموافقة: العنوان: ${alert.title}. التفاصيل: ${alert.detail}. المصدر: ${alert.source}.`;
    const beginReview = (threadId: number) => { setActiveThreadId(threadId); send.mutate({ threadId, message: request }); };
    if (activeThreadId) beginReview(activeThreadId);
    else createThread.mutate({ title: `مراجعة خطأ: ${alert.title.slice(0, 120)}` }, { onSuccess: thread => beginReview(thread.id), onError: error => toast.error(error.message) });
  };

  return <main className="mx-auto max-w-[1500px]" dir="rtl">
    <header className="relative overflow-hidden rounded-[28px] bg-slate-950 px-6 py-7 text-white shadow-xl shadow-blue-950/20">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,rgba(59,130,246,.44),transparent_30%),radial-gradient(circle_at_85%_80%,rgba(139,92,246,.26),transparent_28%)]" />
      <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div><div className="flex items-center gap-2 text-xs font-bold tracking-[.16em] text-blue-200"><BrainCircuit className="size-4" /> APP AGENT / GOVERNED MODE</div><h1 className="mt-3 text-3xl font-black tracking-tight">وكيل التطبيق</h1><p className="mt-2 max-w-2xl text-sm leading-7 text-slate-300">تحدث معه عن التعديلات والأسئلة. يوضح الخطة أولاً، ولا ينفذ أي إجراء إلا بعد موافقتك الصريحة.</p></div>
        <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[.07] px-4 py-3 text-xs text-blue-100"><ShieldCheck className="size-4 text-emerald-300" />الموافقات محفوظة وسجل التنفيذ قابل للمراجعة</div>
      </div>
    </header>

    <section className="mt-5 grid min-h-[690px] gap-5 xl:grid-cols-[300px_minmax(0,1fr)_300px]">
      <aside className="flex min-h-0 flex-col overflow-hidden rounded-3xl border border-blue-100 bg-white shadow-sm">
        <div className="border-b border-blue-50 p-4"><Button onClick={() => createThread.mutate({ title: "محادثة وكيل جديدة" })} disabled={createThread.isPending} className="w-full rounded-xl bg-blue-600 hover:bg-blue-700"><Plus className="ml-2 size-4" />محادثة جديدة</Button></div>
        <ScrollArea className="flex-1"><div className="space-y-2 p-2">{threadsQuery.isLoading && <div className="flex justify-center p-6"><Loader2 className="size-5 animate-spin text-blue-600" /></div>}{threadsQuery.data?.map(thread => <button key={thread.id} onClick={() => setActiveThreadId(thread.id)} className={`w-full rounded-2xl p-3 text-right transition ${thread.id === activeThreadId ? "bg-blue-50 ring-1 ring-blue-200" : "hover:bg-slate-50"}`}><div className="flex items-center justify-between gap-2"><span className="line-clamp-1 text-sm font-bold text-slate-800">{thread.title}</span><Badge className="border-0 bg-slate-100 text-[10px] text-slate-500 hover:bg-slate-100">{thread.status === "active" ? "نشطة" : "مؤرشفة"}</Badge></div><p className="mt-2 flex items-center gap-1 text-[11px] text-slate-400"><Clock3 className="size-3" />{formatDate(thread.updatedAt)}</p></button>)}</div></ScrollArea>
      </aside>

      <section className="flex min-h-0 flex-col overflow-hidden rounded-3xl border border-blue-100 bg-white shadow-[0_18px_55px_-30px_rgba(30,64,175,.3)]">
        {!activeThreadId ? <div className="flex flex-1 flex-col items-center justify-center p-8 text-center"><Sparkles className="mb-4 size-11 text-blue-400" /><h2 className="text-lg font-bold text-slate-800">ابدأ محادثة مع وكيل التطبيق</h2><p className="mt-2 max-w-sm text-sm leading-7 text-slate-500">اطلب شرحاً، أو صف تغييراً تريده، وسيظهر لك أثره المقترح قبل التنفيذ.</p><Button onClick={() => createThread.mutate({ title: "محادثة وكيل جديدة" })} className="mt-5 rounded-xl bg-blue-600 hover:bg-blue-700">بدء محادثة</Button></div> : <>
          <div className="flex items-center justify-between border-b border-blue-50 px-5 py-4"><div><p className="font-bold text-slate-900">{workspaceQuery.data?.thread.title ?? "جارٍ تحميل المحادثة"}</p><p className="mt-1 text-xs text-slate-500">ذاكرة هذه المحادثة خاصة بغرفة العمليات.</p></div><Badge className="border-0 bg-emerald-50 text-emerald-700 hover:bg-emerald-50"><ShieldCheck className="ml-1 size-3.5" />موافقة مطلوبة</Badge></div>
          <ScrollArea className="min-h-0 flex-1"><div className="space-y-5 p-5">{workspaceQuery.isLoading && <div className="flex justify-center p-12"><Loader2 className="size-5 animate-spin text-blue-600" /></div>}{workspaceQuery.data?.messages.map(message => { const proposal = message.proposalId ? proposalsById.get(message.proposalId) : undefined; const isOwner = message.role === "owner"; const isExecuting = proposal?.status === "approved" && proposal.id === executingProposalId; const displayedProgress = isExecuting ? Math.max(proposal?.executionProgress ?? 8, execute.isPending ? Math.min(92, 35 + elapsedSeconds * 12) : proposal?.executionProgress ?? 8) : proposal?.executionProgress ?? 0; return <div key={message.id} className={`flex ${isOwner ? "justify-start" : "justify-end"}`}><div className={`max-w-[92%] ${isOwner ? "order-1" : "order-2"}`}><div className={`rounded-2xl px-4 py-3 text-sm leading-7 ${isOwner ? "bg-blue-600 text-white" : "border border-slate-100 bg-slate-50 text-slate-700"}`}>{isOwner ? <p className="whitespace-pre-wrap">{message.content}</p> : <Streamdown>{message.content}</Streamdown>}</div>{proposal && <article className="mt-3 overflow-hidden rounded-2xl border border-blue-200 bg-white shadow-sm"><div className="flex items-start justify-between gap-4 bg-blue-50 px-4 py-3"><div><div className="flex items-center gap-2 text-sm font-bold text-blue-900"><FileCode2 className="size-4" />بطاقة معاينة</div><p className="mt-1 text-xs text-blue-700">{actionLabels[proposal.actionType]}</p></div><Badge className={`border-0 text-xs ${proposal.status === "draft" ? "bg-amber-100 text-amber-800" : proposal.status === "executed" ? "bg-emerald-100 text-emerald-800" : proposal.status === "approved" ? "bg-blue-100 text-blue-800" : "bg-slate-200 text-slate-700"}`}>{isExecuting ? "جارٍ التنفيذ" : statusLabels[proposal.status]}</Badge></div><div className="space-y-3 p-4"><h3 className="font-bold text-slate-900">{proposal.title}</h3><p className="text-sm leading-6 text-slate-600">{proposal.summary}</p><div className="rounded-xl bg-slate-50 px-3 py-2 text-xs leading-6 text-slate-600"><strong className="text-slate-800">الأثر المتوقع: </strong>{proposal.impact}</div>{isExecuting && <div className="rounded-xl border border-blue-100 bg-blue-50 p-3"><div className="flex items-center justify-between gap-3 text-xs font-bold text-blue-800"><span className="flex items-center gap-1.5"><Loader2 className="size-3.5 animate-spin" />{proposal.executionStage || "جارٍ تجهيز التنفيذ"}</span><span>{displayedProgress}%</span></div><Progress value={displayedProgress} className="mt-2 h-2 bg-blue-100" /><p className="mt-2 text-[11px] text-blue-700">المدة: {elapsedSeconds ? `${elapsedSeconds} ث` : "أقل من ثانية"} · سيجري التحقق تلقائياً قبل إظهار النتيجة.</p></div>}{proposal.status === "draft" ? <div className="flex flex-wrap gap-2"><Button onClick={() => approve.mutate({ id: proposal.id })} disabled={approve.isPending || cancel.isPending || execute.isPending} className="rounded-xl bg-emerald-600 hover:bg-emerald-700"><CheckCircle2 className="ml-2 size-4" />موافقة وتطبيق</Button><Button variant="outline" onClick={() => cancel.mutate({ id: proposal.id })} disabled={approve.isPending || cancel.isPending || execute.isPending} className="rounded-xl border-slate-200"><X className="ml-2 size-4" />إلغاء</Button></div> : proposal.executionResult ? <div className="space-y-2"><p className="rounded-xl bg-slate-50 px-3 py-2 text-xs leading-6 text-slate-600">{proposal.executionResult}</p>{proposal.verificationResult && <p className="rounded-xl bg-emerald-50 px-3 py-2 text-xs leading-6 text-emerald-800"><strong>نتيجة التحقق: </strong>{proposal.verificationResult}</p>}</div> : null}</div></article>}</div></div>; })}{send.isPending && <div className="flex justify-end"><div className="flex items-center gap-2 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-500"><Loader2 className="size-4 animate-spin" />يحلل وكيل التطبيق طلبك…</div></div>}</div></ScrollArea>
          <form onSubmit={submit} className="border-t border-blue-50 bg-white p-4"><div className="rounded-2xl border border-slate-200 bg-slate-50 p-2 transition focus-within:border-blue-400 focus-within:ring-4 focus-within:ring-blue-50"><Textarea value={input} onChange={event => setInput(event.target.value)} disabled={send.isPending} placeholder="اكتب طلبك، مثال: غيّر لون الأزرار إلى الأزرق الداكن…" className="min-h-20 resize-none border-0 bg-transparent text-right shadow-none focus-visible:ring-0" /><div className="flex items-center justify-between gap-3 px-1 pb-1"><span className="text-[11px] text-slate-400">لن يُطبق أي تغيير قبل زر الموافقة.</span><Button type="submit" disabled={!input.trim() || send.isPending} className="rounded-xl bg-blue-600 hover:bg-blue-700"><Send className="ml-2 size-4" />إرسال</Button></div></div></form>
        </>}
      </section>

      <aside className="min-h-0 overflow-hidden rounded-3xl border border-blue-100 bg-white shadow-sm"><div className="flex items-center gap-2 border-b border-blue-50 p-4"><AlertTriangle className="size-4 text-amber-600" /><h2 className="font-bold text-slate-800">غرفة مراجعة الأخطاء</h2></div><div className="border-b border-blue-50 bg-slate-50 p-3"><p className="text-xs leading-5 text-slate-500">يفسر الوكيل التنبيه ويعرض إصلاحاً للموافقة؛ لا يطبق إصلاحاً من تلقاء نفسه.</p><Button variant="outline" size="sm" onClick={startErrorReview} disabled={send.isPending || createThread.isPending || !workspaceQuery.data?.alerts.length} className="mt-2 w-full rounded-xl border-blue-200 text-blue-700 hover:bg-blue-50"><Wrench className="ml-1.5 size-3.5" />مراجعة الخطأ مع الوكيل</Button></div><ScrollArea className="h-[620px]"><div className="space-y-3 p-3">{workspaceQuery.data?.alerts.length ? workspaceQuery.data.alerts.map(alert => <article key={alert.id} className={`rounded-2xl border p-3 ${alert.severity === "error" ? "border-red-100 bg-red-50" : "border-amber-100 bg-amber-50"}`}><div className="flex items-start gap-2"><Wrench className={`mt-0.5 size-4 shrink-0 ${alert.severity === "error" ? "text-red-600" : "text-amber-600"}`} /><div><p className="text-sm font-bold text-slate-800">{alert.title}</p><p className="mt-1 text-xs leading-6 text-slate-600">{alert.detail}</p><p className="mt-2 text-[10px] text-slate-400">{alert.source} · {formatDate(alert.createdAt)}</p></div></div></article>) : <div className="p-5 text-center"><ShieldCheck className="mx-auto mb-3 size-8 text-emerald-500" /><p className="text-sm font-semibold text-slate-700">لا توجد تنبيهات مفتوحة</p><p className="mt-1 text-xs leading-5 text-slate-400">ستظهر هنا الأخطاء المقترحة للمراجعة فور تسجيلها.</p></div>}</div></ScrollArea></aside>
    </section>
  </main>;
}
