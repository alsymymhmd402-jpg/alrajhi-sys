import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { Clipboard, Link2, Loader2, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const labels = { reusable: "قابل لإعادة الاستخدام", one_time: "مرة واحدة", active: "نشط", used: "مستخدم", revoked: "ملغى", expired: "منتهي" };
const formatDate = (value: Date | string | null) => value ? new Intl.DateTimeFormat("ar-EG", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "دون انتهاء";

export default function Invitations() {
  const utils = trpc.useUtils();
  const [label, setLabel] = useState("");
  const [type, setType] = useState<"reusable" | "one_time">("reusable");
  const [expiresAt, setExpiresAt] = useState("");
  const invitationsQuery = trpc.invitations.list.useQuery();
  const createMutation = trpc.invitations.create.useMutation({ onSuccess: () => { setLabel(""); setExpiresAt(""); utils.invitations.list.invalidate(); toast.success("تم إنشاء رابط الدعوة."); }, onError: error => toast.error(error.message) });
  const updateMutation = trpc.invitations.update.useMutation({ onSuccess: () => utils.invitations.list.invalidate(), onError: error => toast.error(error.message) });
  const removeMutation = trpc.invitations.remove.useMutation({ onSuccess: () => { utils.invitations.list.invalidate(); toast.success("تم حذف رابط الدعوة."); }, onError: error => toast.error(error.message) });

  const create = (event: React.FormEvent) => {
    event.preventDefault();
    createMutation.mutate({ label, type, expiresAt: expiresAt ? new Date(expiresAt) : undefined });
  };
  const copy = async (code: string) => {
    await navigator.clipboard.writeText(`${window.location.origin}/invite/${code}`);
    toast.success("تم نسخ رابط الدعوة.");
  };

  return (
    <main className="mx-auto max-w-6xl" dir="rtl">
      <header className="rounded-3xl bg-gradient-to-l from-blue-700 via-blue-600 to-blue-500 px-6 py-7 text-white shadow-xl shadow-blue-200"><p className="text-xs font-semibold tracking-[0.16em] text-blue-100">ACCESS CONTROL</p><h1 className="mt-2 text-2xl font-bold">روابط الدعوة</h1><p className="mt-1 text-sm text-blue-100">أنشئ وصولاً مؤقتاً أو دائماً للعميل، وأبطله متى احتجت.</p></header>
      <section className="mt-5 rounded-3xl border border-blue-100 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2 text-slate-800"><span className="flex size-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600"><Plus className="size-4" /></span><h2 className="font-bold">إنشاء دعوة جديدة</h2></div>
        <form onSubmit={create} className="grid gap-3 lg:grid-cols-[1.4fr_0.85fr_1fr_auto]">
          <Input value={label} onChange={event => setLabel(event.target.value)} placeholder="اسم الدعوة، مثل: عميل جديد" className="h-11 rounded-xl text-right" />
          <Select value={type} onValueChange={value => setType(value as "reusable" | "one_time")}><SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger><SelectContent dir="rtl"><SelectItem value="reusable">قابل لإعادة الاستخدام</SelectItem><SelectItem value="one_time">لمرة واحدة</SelectItem></SelectContent></Select>
          <Input type="datetime-local" value={expiresAt} onChange={event => setExpiresAt(event.target.value)} className="h-11 rounded-xl" aria-label="تاريخ انتهاء اختياري" />
          <Button type="submit" disabled={!label.trim() || createMutation.isPending} className="h-11 rounded-xl bg-blue-600 hover:bg-blue-700">{createMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <><Plus className="ml-2 size-4" />إنشاء</>}</Button>
        </form>
      </section>
      <section className="mt-5 overflow-hidden rounded-3xl border border-blue-100 bg-white shadow-sm">
        <div className="border-b border-blue-50 px-5 py-4"><h2 className="font-bold text-slate-800">الدعوات النشطة والسجل</h2></div>
        <div className="divide-y divide-blue-50">
          {invitationsQuery.isLoading && <div className="flex justify-center p-10"><Loader2 className="size-5 animate-spin text-blue-600" /></div>}
          {!invitationsQuery.isLoading && invitationsQuery.data?.length === 0 && <p className="p-10 text-center text-sm text-slate-400">لم تُنشأ أي دعوات بعد.</p>}
          {invitationsQuery.data?.map(invitation => <article key={invitation.id} className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="font-bold text-slate-800">{invitation.label}</h3><span className="rounded-full bg-blue-50 px-2 py-1 text-xs text-blue-700">{labels[invitation.type]}</span><span className={`rounded-full px-2 py-1 text-xs ${invitation.status === "active" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{labels[invitation.status]}</span></div><p className="mt-2 truncate font-mono text-xs text-slate-500">/invite/{invitation.code}</p><p className="mt-1 text-xs text-slate-400">استخدم {invitation.usageCount} مرة · {formatDate(invitation.expiresAt)}</p></div><div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => copy(invitation.code)} className="rounded-xl"><Clipboard className="ml-2 size-4" />نسخ الرابط</Button>{invitation.status === "active" && <Button variant="outline" onClick={() => updateMutation.mutate({ id: invitation.id, status: "revoked" })} className="rounded-xl border-amber-200 text-amber-700 hover:bg-amber-50">إبطال</Button>}<Button variant="outline" onClick={() => removeMutation.mutate({ id: invitation.id })} className="rounded-xl border-red-200 text-red-600 hover:bg-red-50"><Trash2 className="size-4" /><span className="sr-only">حذف</span></Button></div></article>)}
        </div>
      </section>
    </main>
  );
}
