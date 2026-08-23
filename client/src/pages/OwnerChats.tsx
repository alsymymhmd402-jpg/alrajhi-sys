import { OwnerOutgoingCall } from "@/components/OwnerOutgoingCall";
import { SupportChatThread } from "@/components/SupportChatThread";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { Archive, ArrowRight, ChevronLeft, Loader2, MessageCircleMore, MoreVertical, PhoneCall, Search, SlidersHorizontal, UserRound } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { supportChannelMeta, type SupportChannel } from "@shared/supportChannels";

type SupportStatus = "all" | "open" | "in_progress" | "closed";

const statusLabels = { open: "مفتوحة", in_progress: "قيد المعالجة", closed: "مغلقة" };
const statusTone = { open: "bg-blue-50 text-blue-700", in_progress: "bg-amber-50 text-amber-700", closed: "bg-slate-100 text-slate-500" };
const formatTime = (value: Date | string) => new Intl.DateTimeFormat("ar-EG", { hour: "numeric", minute: "2-digit" }).format(new Date(value));
const fileToBase64 = (file: File) => new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result).split(",")[1] ?? ""); reader.onerror = () => reject(new Error("تعذّر قراءة الملف.")); reader.readAsDataURL(file); });

function CustomerAvatar({ name, url, className = "size-12" }: { name: string; url?: string | null; className?: string }) {
  return <Avatar className={`${className} shrink-0 border border-blue-100`}><AvatarImage src={url ?? undefined} alt={name} /><AvatarFallback className="bg-blue-50 font-bold text-blue-700">{name.trim().slice(0, 1) || "ع"}</AvatarFallback></Avatar>;
}

export function OwnerChatsListPage() {
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<SupportStatus>("all");
  const knownUnread = useRef<Set<number> | null>(null);
  const input = useMemo(() => ({ search: search.trim() || undefined, status, archived: false }), [search, status]);
  const listQuery = trpc.support.list.useQuery(input, { refetchInterval: 3000 });
  const statsQuery = trpc.support.stats.useQuery(undefined, { refetchInterval: 3000 });
  const conversations = listQuery.data ?? [];

  useEffect(() => {
    const next = new Set(conversations.filter(item => item.ownerUnread).map(item => item.id));
    if (knownUnread.current) {
      const received = Array.from(next).filter(id => !knownUnread.current?.has(id));
      if (received.length) toast.message(received.length === 1 ? "وصلت رسالة جديدة من عميل." : `وصلت ${received.length} رسائل جديدة من العملاء.`);
    }
    knownUnread.current = next;
  }, [conversations]);

  return <main className="mx-auto max-w-5xl space-y-5" dir="rtl">
    <header className="rounded-[2rem] bg-gradient-to-l from-[#075e54] via-[#08786d] to-[#1da894] px-5 py-6 text-white shadow-xl shadow-emerald-100 sm:px-7"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-bold tracking-[.18em] text-emerald-100">CUSTOMER MESSAGING</p><h1 className="mt-2 text-2xl font-extrabold">مراسلة العملاء</h1><p className="mt-1 text-sm leading-6 text-emerald-50">اختر عميلاً من القائمة لفتح صفحة محادثته الكاملة.</p></div><div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-center"><strong className="block text-xl">{statsQuery.data?.unread ?? 0}</strong><span className="text-xs text-emerald-50">غير مقروءة</span></div></div></header>
    <section className="overflow-hidden rounded-[1.8rem] border border-emerald-100 bg-white shadow-[0_18px_55px_-30px_rgba(6,95,70,.32)]"><div className="border-b border-emerald-50 p-4 sm:p-5"><div className="grid gap-3 sm:grid-cols-[1fr_180px]"><div className="relative"><Search className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" /><Input value={search} onChange={event => setSearch(event.target.value)} placeholder="ابحث باسم العميل أو الرسالة..." className="h-11 rounded-xl border-slate-200 pr-10 text-right focus-visible:ring-emerald-600" /></div><Select value={status} onValueChange={value => setStatus(value as SupportStatus)}><SelectTrigger className="h-11 rounded-xl border-slate-200 text-right"><SelectValue /></SelectTrigger><SelectContent dir="rtl"><SelectItem value="all">كل المحادثات</SelectItem><SelectItem value="open">مفتوحة</SelectItem><SelectItem value="in_progress">قيد المعالجة</SelectItem><SelectItem value="closed">مغلقة</SelectItem></SelectContent></Select></div></div>
      <div className="divide-y divide-slate-100">{listQuery.isLoading && <div className="flex h-48 items-center justify-center"><Loader2 className="size-6 animate-spin text-emerald-600" /></div>}{!listQuery.isLoading && !conversations.length && <div className="p-12 text-center text-sm text-slate-400">لا توجد محادثات تطابق البحث أو الحالة المحددة.</div>}{conversations.map(conversation => <button key={conversation.id} type="button" onClick={() => setLocation(`/dashboard/chats/${conversation.id}`)} className="group flex w-full items-center gap-3 px-4 py-4 text-right transition hover:bg-emerald-50/50 sm:px-5"><CustomerAvatar name={conversation.guestName} url={conversation.avatarUrl} /><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><p className="truncate font-extrabold text-slate-800">{conversation.guestName}</p><span className="mr-auto text-[11px] text-slate-400">{formatTime(conversation.lastMessageAt)}</span></div><div className="mt-1 flex items-center gap-2"><p className="line-clamp-1 flex-1 text-sm text-slate-500">{conversation.lastMessagePreview || conversation.issue}</p>{conversation.ownerUnread && <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-[10px] font-bold text-white">●</span>}</div><div className="mt-2 flex items-center gap-2"><span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${statusTone[conversation.status]}`}>{statusLabels[conversation.status]}</span><span className="truncate text-[11px] text-slate-400">{conversation.issue}</span></div></div><ChevronLeft className="size-5 shrink-0 text-slate-300 transition group-hover:-translate-x-1 group-hover:text-emerald-600" /></button>)}</div>
    </section>
  </main>;
}

export function OwnerChatDetailPage() {
  const [location, setLocation] = useLocation();
  const conversationId = Number(location.match(/^\/dashboard\/chats\/(\d+)/)?.[1]) || 0;
  const requestedChannel = new URLSearchParams(location.split("?")[1] ?? "").get("channel");
  const channel: SupportChannel = requestedChannel === "finance" ? "finance" : requestedChannel === "follow_up" ? "follow_up" : "institution";
  const utils = trpc.useUtils();
  const detailQuery = trpc.support.ownerConversation.useQuery({ conversationId, channel }, { enabled: conversationId > 0, refetchInterval: 2500 });
  const refresh = useCallback(() => { void utils.support.list.invalidate(); void utils.support.stats.invalidate(); void utils.support.ownerConversation.invalidate({ conversationId, channel }); }, [channel, conversationId, utils]);
  const sendMutation = trpc.support.ownerSend.useMutation({ onSuccess: refresh, onError: error => toast.error(error.message) });
  const attachmentMutation = trpc.support.ownerSendAttachment.useMutation({ onSuccess: () => { refresh(); toast.success("تم إرسال المرفق."); }, onError: error => toast.error(error.message) });
  const updateMutation = trpc.support.update.useMutation({ onSuccess: () => { refresh(); toast.success("تم تحديث المحادثة."); }, onError: error => toast.error(error.message) });
  const detail = detailQuery.data;
  const isPending = sendMutation.isPending || attachmentMutation.isPending;

  if (detailQuery.isLoading) return <div className="flex min-h-[70vh] items-center justify-center"><Loader2 className="size-7 animate-spin text-emerald-600" /></div>;
  if (!detail) return <main className="mx-auto flex min-h-[60vh] max-w-3xl flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-white p-8 text-center" dir="rtl"><MessageCircleMore className="mb-4 size-10 text-slate-300" /><h1 className="font-bold text-slate-800">لم نعثر على هذه المحادثة</h1><Button onClick={() => setLocation("/dashboard/chats")} className="mt-5 rounded-xl bg-emerald-600 hover:bg-emerald-700">العودة إلى المراسلات</Button></main>;

  const { conversation } = detail;
  const openCustomerUi = () => conversation.contactId ? setLocation(`/dashboard/customer-ui?contact=${conversation.contactId}`) : toast.error("لم يرتبط بهذه المحادثة ملف عميل بعد.");
  const openCustomerProfile = () => conversation.contactId ? setLocation(`/dashboard/contacts?contact=${conversation.contactId}`) : toast.error("لم يرتبط بهذه المحادثة ملف عميل بعد.");
  const menu = <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="size-9 rounded-xl text-slate-500 hover:bg-slate-100"><MoreVertical className="size-5" /><span className="sr-only">خيارات المحادثة</span></Button></DropdownMenuTrigger><DropdownMenuContent align="start" className="w-56 rounded-2xl p-2 text-right"><DropdownMenuLabel>خيارات محادثة العميل</DropdownMenuLabel><DropdownMenuSeparator /><DropdownMenuItem onSelect={openCustomerProfile} className="gap-2 rounded-xl"><UserRound className="size-4" />ملف العميل</DropdownMenuItem><DropdownMenuItem onSelect={openCustomerUi} className="gap-2 rounded-xl"><SlidersHorizontal className="size-4" />تخصيص واجهة العميل والخلفية</DropdownMenuItem><DropdownMenuItem onSelect={() => updateMutation.mutate({ conversationId, archived: true })} className="gap-2 rounded-xl text-rose-600 focus:text-rose-600"><Archive className="size-4" />أرشفة المحادثة</DropdownMenuItem></DropdownMenuContent></DropdownMenu>;

  return <main className="mx-auto flex min-h-[calc(100vh-9rem)] max-w-5xl flex-col gap-4" dir="rtl"><header className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-100 bg-white px-4 py-3 shadow-sm"><div className="flex items-center gap-3"><Button variant="outline" size="icon" onClick={() => setLocation("/dashboard/chats")} className="size-10 rounded-xl border-slate-200"><ArrowRight className="size-4" /><span className="sr-only">العودة إلى قائمة المراسلات</span></Button><div><p className="font-extrabold text-slate-800">{conversation.guestName}</p><p className="mt-0.5 text-xs text-slate-400">{supportChannelMeta[channel].label} · {supportChannelMeta[channel].subtitle}</p></div></div><div className="flex items-center gap-2"><Select value={conversation.status} onValueChange={value => updateMutation.mutate({ conversationId, status: value as "open" | "in_progress" | "closed" })}><SelectTrigger className="h-10 w-32 rounded-xl border-slate-200 text-xs"><SelectValue /></SelectTrigger><SelectContent dir="rtl"><SelectItem value="open">مفتوحة</SelectItem><SelectItem value="in_progress">قيد المعالجة</SelectItem><SelectItem value="closed">مغلقة</SelectItem></SelectContent></Select><OwnerOutgoingCall conversationId={conversationId} disabled={conversation.status === "closed"} /></div></header><section className="flex flex-wrap gap-2 rounded-2xl border border-emerald-100 bg-emerald-50/60 p-3">{(["institution", "finance", "follow_up"] as SupportChannel[]).map(item => <Button key={item} type="button" variant={channel === item ? "default" : "outline"} onClick={() => setLocation(`/dashboard/chats/${conversationId}${item === "institution" ? "" : `?channel=${item}`}`)} className={channel === item ? "rounded-xl bg-[#075e54] hover:bg-[#064a42]" : "rounded-xl border-emerald-200 bg-white text-emerald-800 hover:bg-emerald-100"}>{supportChannelMeta[item].label}</Button>)}</section><div className="min-h-0 flex flex-1"><SupportChatThread messages={detail.messages} attachments={detail.attachments} viewer="owner" title={conversation.guestName} subtitle={supportChannelMeta[channel].label} avatarUrl={conversation.avatarUrl} headerMenu={menu} disabled={conversation.status === "closed"} isSending={isPending} onSend={content => sendMutation.mutate({ conversationId, channel, content })} onSendAttachment={async file => { try { attachmentMutation.mutate({ conversationId, channel, fileName: file.name, mimeType: file.type || "application/octet-stream", base64: await fileToBase64(file) }); } catch (error) { toast.error(error instanceof Error ? error.message : "تعذّر تجهيز الملف."); } }} /></div></main>;
}
