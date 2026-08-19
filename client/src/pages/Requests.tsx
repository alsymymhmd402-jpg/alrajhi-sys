import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { ClipboardList, Loader2, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

const labels = { new: "جديد", in_progress: "قيد المعالجة", waiting: "قيد الانتظار", completed: "مكتمل", closed: "مغلق" };
type RequestStatus = keyof typeof labels;
const formatDate = (value: Date | string) => new Intl.DateTimeFormat("ar-EG", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));

export default function Requests() {
  const [search, setSearch] = useState(""); const [status, setStatus] = useState<RequestStatus | "all">("all"); const utils = trpc.useUtils();
  const input = useMemo(() => ({ search: search || undefined, status }), [search, status]);
  const listQuery = trpc.requests.list.useQuery(input, { refetchInterval: 5000 });
  const updateMutation = trpc.requests.update.useMutation({ onSuccess: () => { utils.requests.list.invalidate(); toast.success("تم تحديث حالة الطلب."); }, onError: error => toast.error(error.message) });
  return <main className="mx-auto max-w-6xl" dir="rtl"><header className="rounded-3xl bg-gradient-to-l from-blue-700 via-blue-600 to-blue-500 px-6 py-7 text-white shadow-xl shadow-blue-200"><p className="text-xs font-bold tracking-[.16em] text-blue-100">REQUEST CENTER</p><h1 className="mt-2 text-2xl font-bold">الطلبات</h1><p className="mt-1 text-sm text-blue-100">تابع كل طلب من لحظة وصوله حتى إغلاقه.</p></header><section className="mt-5 overflow-hidden rounded-3xl border border-blue-100 bg-white shadow-sm"><div className="flex flex-col gap-3 border-b border-blue-50 p-4 sm:flex-row"><div className="relative flex-1"><Search className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" /><Input value={search} onChange={event => setSearch(event.target.value)} placeholder="ابحث برقم الطلب أو الوصف" className="h-11 rounded-xl pr-9 text-right" /></div><Select value={status} onValueChange={value => setStatus(value as RequestStatus | "all")}><SelectTrigger className="h-11 rounded-xl sm:w-48"><SelectValue /></SelectTrigger><SelectContent dir="rtl"><SelectItem value="all">كل الحالات</SelectItem>{Object.entries(labels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></div>{listQuery.isLoading && <div className="flex justify-center p-12"><Loader2 className="size-5 animate-spin text-blue-600" /></div>}{!listQuery.isLoading && listQuery.data?.length === 0 && <div className="p-12 text-center text-slate-400"><ClipboardList className="mx-auto mb-3 size-9 text-blue-300" />لا توجد طلبات مطابقة.</div>}<div className="divide-y divide-blue-50">{listQuery.data?.map(request => <article key={request.id} className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><strong className="text-slate-800">{request.requestNumber}</strong><Badge className="border-0 bg-blue-50 text-blue-700 hover:bg-blue-50">{labels[request.status]}</Badge></div><p className="mt-2 line-clamp-2 text-sm text-slate-600">{request.description}</p><p className="mt-2 text-xs text-slate-400">آخر تحديث: {formatDate(request.lastUpdatedAt)}</p></div><Select value={request.status} onValueChange={value => updateMutation.mutate({ id: request.id, status: value as RequestStatus })}><SelectTrigger className="h-10 w-44 rounded-xl"><SelectValue /></SelectTrigger><SelectContent dir="rtl">{Object.entries(labels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></article>)}</div></section></main>;
}
