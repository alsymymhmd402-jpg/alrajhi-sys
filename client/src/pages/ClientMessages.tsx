import { ClientBottomNav } from "@/components/ClientBottomNav";
import ClientSessionUnavailable from "@/pages/ClientSessionUnavailable";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getClientSession } from "@/lib/clientSession";
import { trpc } from "@/lib/trpc";
import { Bot, ChevronLeft, ClipboardCheck, Loader2, MessageCircleMore, ShieldCheck } from "lucide-react";
import { useMemo } from "react";
import { useLocation, useRoute } from "wouter";

const logoUrl = "/manus-storage/alwaleed-philanthropies-mark_d87d264e.jpg";
const formatTime = (value?: Date | string) => value ? new Intl.DateTimeFormat("ar-EG", { hour: "numeric", minute: "2-digit" }).format(new Date(value)) : "";

type ChannelRowProps = { icon: React.ReactNode; iconTone: string; title: string; preview: string; meta: string; unread?: boolean; onClick: () => void };
function ChannelRow({ icon, iconTone, title, preview, meta, unread, onClick }: ChannelRowProps) {
  return <button type="button" onClick={onClick} className="group flex w-full items-center gap-3 border-b border-white/10 px-4 py-4 text-right transition hover:bg-white/[.045]"><span className={`flex size-12 shrink-0 items-center justify-center rounded-2xl ${iconTone}`}>{icon}</span><span className="min-w-0 flex-1"><span className="flex items-center gap-2"><strong className="truncate text-sm text-[#f4faf8]">{title}</strong><small className="mr-auto shrink-0 text-[10px] text-[#8ba9a0]">{meta}</small></span><span className="mt-1 flex items-center gap-2"><span className="truncate text-xs text-[#9bb4ac]">{preview}</span>{unread && <b className="mr-auto flex size-5 shrink-0 items-center justify-center rounded-full bg-[#00a884] text-[10px] text-[#06251f]">1</b>}</span></span><ChevronLeft className="size-4 shrink-0 text-[#6f8a81] transition group-hover:-translate-x-1 group-hover:text-[#00d9a9]" /></button>;
}

export default function ClientMessages() {
  const [, params] = useRoute("/client/:publicId/messages");
  const [, setLocation] = useLocation();
  const publicId = params?.publicId ?? "";
  const accessToken = useMemo(() => publicId ? getClientSession(publicId) : null, [publicId]);
  const conversationQuery = trpc.support.guestConversation.useQuery({ publicId, accessToken: accessToken ?? "" }, { enabled: Boolean(publicId && accessToken), refetchInterval: 3000 });
  const applicationQuery = trpc.support.guestApplications.useQuery({ publicId, accessToken: accessToken ?? "" }, { enabled: Boolean(publicId && accessToken), refetchInterval: 5000 });
  if (!accessToken) return <ClientSessionUnavailable />;
  if (conversationQuery.isLoading) return <div className="flex min-h-screen items-center justify-center bg-[#0b141a]"><Loader2 className="size-7 animate-spin text-[#00a884]" /></div>;
  const conversation = conversationQuery.data?.conversation;
  const request = applicationQuery.data?.requests[0];
  return <main className="h-[100dvh] overflow-hidden bg-[#07100d] p-0 sm:flex sm:items-center sm:justify-center sm:p-6" dir="rtl"><section className="mx-auto flex h-[100dvh] w-full max-w-md flex-col overflow-hidden bg-[#0b141a] shadow-2xl sm:h-[min(92dvh,820px)] sm:rounded-[2rem]">
    <header className="flex shrink-0 items-center justify-between border-b border-white/10 bg-[#17252b] px-4 py-4 text-white"><div className="flex items-center gap-3"><Avatar className="size-11 border border-[#00a884]/50"><AvatarImage src={logoUrl} alt="مؤسسة الوليد بن طلال الإنسانية" /><AvatarFallback>م</AvatarFallback></Avatar><div><h1 className="text-base font-extrabold">مراسلة المؤسسة</h1><p className="mt-0.5 text-[11px] text-[#9bb4ac]">قنوات التواصل والمتابعة</p></div></div><span className="flex size-9 items-center justify-center rounded-xl bg-[#00a884]/15 text-[#00d9a9]"><MessageCircleMore className="size-5" /></span></header>
    <div className="flex shrink-0 items-center gap-2 border-b border-white/10 bg-[#111c21] px-4 py-3 text-xs text-[#b6d4ca]"><ShieldCheck className="size-4 text-[#00a884]" />اختر إحدى المحادثات الثلاث للبدء أو المتابعة.</div>
    <div className="min-h-0 flex-1 overflow-y-auto"><ChannelRow icon={<img src={logoUrl} alt="" className="h-full w-full object-cover" />} iconTone="overflow-hidden bg-[#075e54]" title="مؤسسة الوليد بن طلال للإنسانية" preview={conversation?.lastMessagePreview || "مرحباً بك، كيف يمكننا مساعدتك؟"} meta={formatTime(conversation?.lastMessageAt) || "الآن"} unread={conversation?.status === "open"} onClick={() => setLocation(`/client/${publicId}/chat`)} /><ChannelRow icon={<Bot className="size-6" />} iconTone="bg-[#123d49] text-[#62d6e8]" title="المساعد الآلي للمؤسسة" preview="اسأل عن خدمات المؤسسة والطلبات العامة" meta="متاح" onClick={() => setLocation(`/client/${publicId}/chat?mode=assistant`)} /><ChannelRow icon={<ClipboardCheck className="size-6" />} iconTone="bg-[#3d3020] text-[#ffce7a]" title="متابعة الطلب والقبول" preview={request ? `${request.requestNumber} · ${request.title}` : "ستظهر حالة طلبك وتحديثاته هنا"} meta="متابعة" onClick={() => setLocation(`/client/${publicId}/chat?mode=acceptance`)} /></div>
    <ClientBottomNav publicId={publicId} active="support" />
  </section></main>;
}
