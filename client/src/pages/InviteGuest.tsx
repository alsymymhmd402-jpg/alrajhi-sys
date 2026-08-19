import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Link2, Loader2, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useLocation, useRoute } from "wouter";

export default function InviteGuest() {
  const [, params] = useRoute("/invite/:code");
  const [, setLocation] = useLocation();
  const code = params?.code ?? "";
  const [guestName, setGuestName] = useState("");
  const [issue, setIssue] = useState("");
  const previewQuery = trpc.invitations.preview.useQuery({ code }, { enabled: Boolean(code) });
  const createMutation = trpc.support.create.useMutation({ onSuccess: ({ publicId, accessToken }) => { sessionStorage.setItem(`voice-circle:${publicId}`, accessToken); setLocation(`/chat/${publicId}`); }, onError: error => toast.error(error.message) });

  if (!previewQuery.isFetched) return <div className="flex min-h-screen items-center justify-center bg-blue-50"><Loader2 className="size-7 animate-spin text-blue-600" /></div>;
  if (previewQuery.isError || !previewQuery.data) return <main className="flex min-h-screen items-center justify-center bg-blue-50 p-4" dir="rtl"><section className="max-w-md rounded-3xl bg-white p-8 text-center shadow-xl shadow-blue-100"><Link2 className="mx-auto mb-4 size-10 text-blue-600" /><h1 className="text-xl font-bold text-slate-900">رابط الدعوة غير متاح</h1><p className="mt-3 text-sm leading-7 text-slate-500">قد يكون الرابط غير صحيح أو أُلغي أو انتهت صلاحيته.</p></section></main>;

  return <main className="min-h-screen bg-blue-50 px-4 py-8 sm:px-8" dir="rtl"><section className="mx-auto max-w-lg rounded-[2rem] border border-blue-100 bg-white p-6 shadow-xl shadow-blue-100 sm:p-8"><span className="flex size-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600"><ShieldCheck className="size-6" /></span><p className="mt-5 text-sm font-semibold text-blue-700">دعوة دعم خاصة</p><h1 className="mt-2 text-2xl font-bold text-slate-900">{previewQuery.data.label}</h1><p className="mt-2 text-sm leading-7 text-slate-500">اكتب بياناتك لبدء محادثة مباشرة وآمنة مع فريق الدعم.</p><form onSubmit={event => { event.preventDefault(); createMutation.mutate({ guestName, issue, inviteCode: code }); }} className="mt-7 space-y-4"><label className="block"><span className="mb-2 block text-sm font-semibold text-slate-700">الاسم</span><Input value={guestName} onChange={event => setGuestName(event.target.value)} placeholder="اكتب اسمك" className="h-12 rounded-xl text-right" /></label><label className="block"><span className="mb-2 block text-sm font-semibold text-slate-700">ما الذي تحتاج إليه؟</span><Textarea value={issue} onChange={event => setIssue(event.target.value)} placeholder="صف طلبك أو مشكلتك باختصار..." className="min-h-32 resize-none rounded-xl text-right leading-7" /></label><Button type="submit" disabled={createMutation.isPending || !guestName.trim() || !issue.trim()} className="h-12 w-full rounded-xl bg-blue-600 hover:bg-blue-700">{createMutation.isPending ? <Loader2 className="ml-2 size-4 animate-spin" /> : <ArrowLeft className="ml-2 size-4" />}فتح المحادثة</Button></form></section></main>;
}
