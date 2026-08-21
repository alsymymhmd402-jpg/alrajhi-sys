import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { Bell, ChevronLeft, Loader2, MessageCircle, Phone, Settings, ShieldCheck } from "lucide-react";
import { useEffect, useMemo } from "react";
import { toast } from "sonner";
import { useLocation, useRoute } from "wouter";

const logoUrl = "/manus-storage/alwaleed-philanthropies-mark_d87d264e.jpg";
const timeFormatter = new Intl.DateTimeFormat("ar-EG", { hour: "numeric", minute: "2-digit" });

export default function ClientHome() {
  const [, params] = useRoute("/client/:publicId");
  const [, setLocation] = useLocation();
  const publicId = params?.publicId ?? "";
  const accessToken = useMemo(() => publicId ? sessionStorage.getItem(`voice-circle:${publicId}`) : null, [publicId]);
  const conversationQuery = trpc.support.guestConversation.useQuery({ publicId, accessToken: accessToken ?? "" }, { enabled: Boolean(publicId && accessToken) });

  useEffect(() => {
    if (!accessToken) setLocation("/invite/session-unavailable");
  }, [accessToken, setLocation]);

  if (!accessToken) return null;
  if (conversationQuery.isLoading) return <div className="flex min-h-screen items-center justify-center bg-[#e8efe9]"><Loader2 className="size-7 animate-spin text-[#128c7e]" /></div>;
  if (conversationQuery.isError || !conversationQuery.data) return <div className="flex min-h-screen items-center justify-center bg-[#e8efe9] p-6 text-center text-sm text-slate-600">تعذّر تحميل قائمة مراسلاتك.</div>;
  const { conversation, messages } = conversationQuery.data;
  const latest = messages.at(-1);
  return <main className="min-h-screen bg-[#e8efe9] p-0 sm:p-6" dir="rtl"><section className="mx-auto flex min-h-screen max-w-md flex-col overflow-hidden bg-white shadow-2xl sm:min-h-[760px] sm:rounded-[2rem]"><header className="bg-[#075e54] px-4 pb-5 pt-4 text-white"><div className="flex items-center justify-between"><h1 className="text-lg font-bold">مراسلة المؤسسة</h1><div className="flex gap-1"><Button variant="ghost" size="icon" className="size-9 text-white hover:bg-white/15 hover:text-white" onClick={() => setLocation(`/chat/${publicId}`)}><Bell className="size-5" /></Button><Button variant="ghost" size="icon" className="size-9 text-white hover:bg-white/15 hover:text-white" onClick={() => setLocation(`/client/${publicId}/privacy`)}><Settings className="size-5" /></Button></div></div><p className="mt-1 text-xs text-emerald-100">مؤسسة الوليد بن طلال الإنسانية</p></header><div className="flex-1 bg-white"><button onClick={() => setLocation(`/chat/${publicId}`)} className="flex w-full items-center gap-3 border-b border-slate-100 px-4 py-4 text-right transition hover:bg-emerald-50/40"><Avatar className="size-14 border border-emerald-100"><AvatarImage src={logoUrl} alt="مؤسسة الوليد بن طلال الإنسانية" /><AvatarFallback>م</AvatarFallback></Avatar><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-3"><p className="truncate font-bold text-slate-900">مراسلة المؤسسة</p><span className="text-[11px] text-slate-400">{latest ? timeFormatter.format(new Date(latest.createdAt)) : ""}</span></div><p className="mt-1 line-clamp-1 text-xs leading-5 text-slate-500">{latest?.content || conversation.issue}</p></div><ChevronLeft className="size-5 text-slate-300" /></button></div><nav className="grid grid-cols-3 border-t border-slate-100 bg-white py-2"><button className="flex flex-col items-center gap-1 text-[11px] font-bold text-[#128c7e]"><MessageCircle className="size-5" />المحادثات</button><button onClick={() => setLocation(`/chat/${publicId}`)} className="flex flex-col items-center gap-1 text-[11px] text-slate-500"><Phone className="size-5" />المكالمات</button><button onClick={() => setLocation(`/client/${publicId}/privacy`)} className="flex flex-col items-center gap-1 text-[11px] text-slate-500"><ShieldCheck className="size-5" />الخصوصية</button></nav></section></main>;
}
