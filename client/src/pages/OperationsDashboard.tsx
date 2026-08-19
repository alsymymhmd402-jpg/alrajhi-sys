import { trpc } from "@/lib/trpc";
import { Activity, Bell, Bot, Link2, Loader2, MessageCircle, PhoneCall, Radio, UsersRound } from "lucide-react";

const tiles = [
  { key: "customers", label: "العملاء", icon: UsersRound },
  { key: "requests", label: "الطلبات", icon: Activity },
  { key: "activeChats", label: "المحادثات النشطة", icon: MessageCircle },
  { key: "calls", label: "المكالمات", icon: PhoneCall },
  { key: "activeInvites", label: "الروابط النشطة", icon: Link2 },
  { key: "usedInvites", label: "الروابط المستخدمة", icon: Radio },
] as const;

export default function OperationsDashboard() {
  const summaryQuery = trpc.operations.summary.useQuery(undefined, { refetchInterval: 5000 });
  const activityQuery = trpc.operations.activity.useQuery(undefined, { refetchInterval: 5000 });
  const voiceQuery = trpc.voice.status.useQuery(undefined, { refetchInterval: 10000 });
  if (summaryQuery.isLoading) return <div className="flex min-h-80 items-center justify-center"><Loader2 className="size-6 animate-spin text-blue-600" /></div>;
  const summary = summaryQuery.data;
  return <main className="mx-auto max-w-6xl" dir="rtl">
    <header className="rounded-3xl bg-gradient-to-l from-blue-800 via-blue-700 to-blue-500 px-6 py-8 text-white shadow-xl shadow-blue-200"><p className="text-xs font-bold tracking-[.18em] text-blue-100">VOICE CIRCLE / OPERATIONS</p><h1 className="mt-2 text-3xl font-bold">غرفة العمليات</h1><p className="mt-2 max-w-2xl text-sm leading-7 text-blue-100">نظرة موحدة على العملاء والطلبات والمحادثات والمكالمات وروابط الوصول.</p></header>
    <section className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{tiles.map(tile => { const Icon = tile.icon; return <article key={tile.key} className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm"><Icon className="size-5 text-blue-600" /><p className="mt-4 text-3xl font-bold text-slate-900">{summary?.[tile.key] ?? 0}</p><p className="mt-1 text-sm text-slate-500">{tile.label}</p></article>; })}</section>
    <section className="mt-5 grid gap-5 lg:grid-cols-2"><article className="rounded-3xl border border-blue-100 bg-white p-5 shadow-sm"><div className="flex items-center gap-2"><span className="flex size-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600"><Activity className="size-4" /></span><h2 className="font-bold text-slate-800">حالة النظام</h2></div><dl className="mt-5 space-y-3 text-sm"><div className="flex justify-between rounded-xl bg-slate-50 px-3 py-3"><dt className="text-slate-500">الخدمة الخلفية</dt><dd className="font-semibold text-emerald-700">متاحة</dd></div><div className="flex justify-between rounded-xl bg-slate-50 px-3 py-3"><dt className="text-slate-500">WebRTC</dt><dd className="font-semibold text-blue-700">{voiceQuery.data?.webRtc ?? "جارٍ التحقق"}</dd></div><div className="flex justify-between rounded-xl bg-slate-50 px-3 py-3"><dt className="text-slate-500">TURN للإنتاج</dt><dd className="font-semibold text-amber-700">{voiceQuery.data?.turn ?? "NOT CONFIGURED"}</dd></div></dl></article><article className="rounded-3xl border border-blue-100 bg-white p-5 shadow-sm"><div className="flex items-center gap-2"><span className="flex size-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600"><Bot className="size-4" /></span><h2 className="font-bold text-slate-800">Voice AI</h2></div><p className="mt-5 rounded-2xl bg-amber-50 p-4 text-sm leading-7 text-amber-800">الحالة: <strong>{voiceQuery.data?.provider ?? "NOT CONFIGURED"}</strong>. لا توجد مفاتيح أو بيانات سرية ظاهرة في الواجهة.</p><p className="mt-3 text-sm text-slate-500">النماذج الصوتية المسجلة: {voiceQuery.data?.models ?? 0}</p></article></section><section className="mt-5 rounded-3xl border border-blue-100 bg-white p-5 shadow-sm"><div className="flex items-center gap-2"><span className="flex size-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600"><Bell className="size-4" /></span><h2 className="font-bold text-slate-800">آخر النشاطات والتنبيهات</h2></div><div className="mt-4 space-y-2">{activityQuery.data?.length ? activityQuery.data.map(item => <div key={item.id} className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 px-4 py-3"><p className="text-sm font-medium text-slate-700">{item.title}</p><time className="shrink-0 text-xs text-slate-400">{new Intl.DateTimeFormat("ar-EG", { hour: "numeric", minute: "2-digit" }).format(new Date(item.at))}</time></div>) : <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-400">لا توجد نشاطات مسجلة بعد.</p>}</div></section>
  </main>;
}
