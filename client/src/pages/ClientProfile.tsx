import { ClientBottomNav } from "@/components/ClientBottomNav";
import ClientSessionUnavailable from "@/pages/ClientSessionUnavailable";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { getClientSession } from "@/lib/clientSession";
import { trpc } from "@/lib/trpc";
import { FileText, Loader2, LockKeyhole, ShieldCheck, UserRound } from "lucide-react";
import { useMemo } from "react";
import { useLocation, useRoute } from "wouter";

const logoUrl = "/manus-storage/alwaleed-philanthropies-mark_d87d264e.jpg";

export default function ClientProfile() {
  const [, params] = useRoute("/client/:publicId/profile");
  const [, setLocation] = useLocation();
  const publicId = params?.publicId ?? "";
  const accessToken = useMemo(() => publicId ? getClientSession(publicId) : null, [publicId]);
  const conversationQuery = trpc.support.guestConversation.useQuery({ publicId, accessToken: accessToken ?? "" }, { enabled: Boolean(publicId && accessToken) });
  if (!accessToken) return <ClientSessionUnavailable />;
  if (conversationQuery.isLoading) return <div className="flex min-h-screen items-center justify-center bg-[#e8efe9]"><Loader2 className="size-7 animate-spin text-[#128c7e]" /></div>;
  if (!conversationQuery.data) return <ClientSessionUnavailable />;
  const { conversation } = conversationQuery.data;
  const startedAt = new Intl.DateTimeFormat("ar-EG", { dateStyle: "medium" }).format(new Date(conversation.createdAt));
  return <main className="min-h-screen bg-[#e8efe9] p-0 sm:p-6" dir="rtl"><section className="mx-auto flex min-h-screen max-w-md flex-col overflow-hidden bg-white shadow-2xl sm:min-h-[760px] sm:rounded-[2rem]">
    <header className="bg-[#075e54] px-5 pb-6 pt-5 text-center text-white"><Avatar className="mx-auto size-20 border-4 border-white/30"><AvatarImage src={logoUrl} alt="مؤسسة الوليد بن طلال الإنسانية" /><AvatarFallback><UserRound /></AvatarFallback></Avatar><h1 className="mt-3 text-lg font-extrabold">{conversation.guestName}</h1><p className="mt-1 text-xs text-emerald-100">ملف العميل في مراسلة المؤسسة</p></header>
    <div className="flex-1 space-y-4 p-5"><section className="rounded-2xl border border-slate-100 bg-slate-50 p-4"><div className="flex items-start gap-3"><FileText className="mt-0.5 size-5 text-[#128c7e]" /><div><p className="text-xs font-bold text-slate-500">موضوع المتابعة</p><p className="mt-1 text-sm leading-6 text-slate-800">{conversation.issue}</p></div></div></section><section className="rounded-2xl border border-slate-100 p-4"><p className="text-xs font-bold text-slate-500">بدأت المتابعة</p><p className="mt-1 text-sm font-bold text-slate-800">{startedAt}</p></section><section className="rounded-2xl bg-emerald-50 p-4"><div className="flex items-start gap-3"><LockKeyhole className="mt-0.5 size-5 text-[#128c7e]" /><div><h2 className="font-bold text-emerald-950">بياناتك خاصة</h2><p className="mt-1 text-sm leading-6 text-emerald-900">لا تظهر معلوماتك إلا لفريق المؤسسة المكلّف بمتابعة طلبك.</p></div></div></section><Button variant="outline" onClick={() => setLocation(`/client/${publicId}/privacy`)} className="h-11 w-full rounded-xl border-emerald-200 text-[#075e54] hover:bg-emerald-50">سياسة الخصوصية والأمان</Button></div>
    <ClientBottomNav publicId={publicId} active="profile" />
  </section></main>;
}
