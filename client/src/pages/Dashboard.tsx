import DashboardLayout from "@/components/DashboardLayout";
import { OwnerCallListener } from "@/components/OwnerCallListener";
import { OwnerOutgoingCall } from "@/components/OwnerOutgoingCall";
import CallLogs from "@/pages/CallLogs";
import Contacts from "@/pages/Contacts";
import Invitations from "@/pages/Invitations";
import OperationsDashboard from "@/pages/OperationsDashboard";
import Requests from "@/pages/Requests";
import Settings from "@/pages/Settings";
import { VoiceModels, VoiceStatus } from "@/pages/VoiceConsole";
import { SupportChatThread } from "@/components/SupportChatThread";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { Archive, Inbox, Loader2, MessageSquareText, Search, Users } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { io } from "socket.io-client";

const statusLabels = { open: "مفتوحة", in_progress: "قيد المعالجة", closed: "مغلقة" };
type StatusFilter = "all" | "open" | "in_progress" | "closed";

const formatDate = (value: Date | string) => new Intl.DateTimeFormat("ar-EG", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
const fileToBase64 = (file: File) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
  reader.onerror = () => reject(new Error("تعذّر قراءة الملف."));
  reader.readAsDataURL(file);
});

function StatusBadge({ status }: { status: "open" | "in_progress" | "closed" }) {
  const colors = { open: "bg-blue-100 text-blue-700", in_progress: "bg-amber-100 text-amber-700", closed: "bg-slate-200 text-slate-600" };
  return <Badge className={`border-0 px-2.5 py-1 font-medium hover:${colors[status]} ${colors[status]}`}>{statusLabels[status]}</Badge>;
}

function InboxContent() {
  const [location] = useLocation();
  const isArchive = location === "/dashboard/archive";
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [activeId, setActiveId] = useState<number | null>(null);
  const knownUnreadIds = useRef<Set<number> | null>(null);
  const utils = trpc.useUtils();
  const listQuery = trpc.support.list.useQuery({ search: search || undefined, status, archived: isArchive }, { refetchInterval: 3000 });
  const statsQuery = trpc.support.stats.useQuery(undefined, { refetchInterval: 3000, enabled: !isArchive });
  const conversationQuery = trpc.support.ownerConversation.useQuery({ conversationId: activeId ?? 0 }, { enabled: activeId !== null, refetchInterval: 2500 });

  useEffect(() => {
    const firstId = listQuery.data?.[0]?.id ?? null;
    if (!activeId || !listQuery.data?.some(item => item.id === activeId)) setActiveId(firstId);
  }, [activeId, listQuery.data]);

  const refresh = useCallback(() => {
    utils.support.list.invalidate();
    utils.support.stats.invalidate();
    utils.support.ownerConversation.invalidate();
  }, [utils]);
  const sendMutation = trpc.support.ownerSend.useMutation({ onSuccess: refresh, onError: error => toast.error(error.message) });
  const attachmentMutation = trpc.support.ownerSendAttachment.useMutation({ onSuccess: () => { refresh(); toast.success("تم إرسال الملف."); }, onError: error => toast.error(error.message) });
  const updateMutation = trpc.support.update.useMutation({
    onSuccess: (_, input) => {
      refresh();
      toast.success(input.archived ? "تمت أرشفة المحادثة." : "تم تحديث حالة المحادثة.");
    },
    onError: error => toast.error(error.message),
  });
  const { mutateAsync: getOwnerRealtimeToken } = trpc.calls.ownerRealtimeToken.useMutation();
  const conversations = listQuery.data ?? [];
  const detail = conversationQuery.data;

  useEffect(() => {
    const unreadIds = new Set(conversations.filter(conversation => conversation.ownerUnread).map(conversation => conversation.id));
    if (knownUnreadIds.current) {
      const newlyUnread = Array.from(unreadIds).filter(id => !knownUnreadIds.current?.has(id));
      if (newlyUnread.length > 0) toast.message(newlyUnread.length === 1 ? "وصلت رسالة جديدة من عميل." : `وصلت ${newlyUnread.length} رسائل جديدة من العملاء.`);
    }
    knownUnreadIds.current = unreadIds;
  }, [conversations]);

  useEffect(() => {
    if (!activeId) return;
    let stopped = false;
    let socket: ReturnType<typeof io> | null = null;
    const connect = async () => {
      try {
        const auth = await getOwnerRealtimeToken();
        if (stopped) return;
        socket = io({ path: "/api/realtime", transports: ["websocket"], auth: { role: "owner", token: auth.token } });
        socket.on("connect", () => socket?.emit("chat:join", { conversationId: activeId }));
        socket.on("chat:message", () => refresh());
        socket.io.on("reconnect", () => { refresh(); toast.success("تمت إعادة اتصال المحادثة."); });
      } catch {
        // تبقى آلية الاستعلام الدورية كمسار احتياطي عند فشل فتح القناة الحية.
      }
    };
    void connect();
    return () => { stopped = true; socket?.disconnect(); };
  }, [activeId, getOwnerRealtimeToken, refresh]);

  return (
    <div className="mx-auto flex max-w-[1480px] flex-col gap-5" dir="rtl">
      <header className="flex flex-col justify-between gap-4 rounded-3xl bg-gradient-to-l from-blue-700 via-blue-600 to-blue-500 px-6 py-6 text-white shadow-xl shadow-blue-200 lg:flex-row lg:items-center">
        <div>
          <p className="text-xs font-semibold tracking-[0.18em] text-blue-100">VOICE CIRCLE</p>
          <h1 className="mt-2 text-2xl font-bold">{isArchive ? "أرشيف المحادثات" : "مركز دعم العملاء"}</h1>
          <p className="mt-1 text-sm text-blue-100">تابع الرسائل الواردة وأدر المحادثات من مكان واحد.</p>
        </div>
        {!isArchive && <div className="rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-sm"><span className="font-bold">{statsQuery.data?.unread ?? 0}</span> رسائل تحتاج إلى متابعة</div>}
      </header>

      {!isArchive && (
        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[{ label: "كل المحادثات", value: statsQuery.data?.total ?? 0, icon: MessageSquareText }, { label: "مفتوحة", value: statsQuery.data?.open ?? 0, icon: Inbox }, { label: "قيد المعالجة", value: statsQuery.data?.inProgress ?? 0, icon: Users }, { label: "غير مقروءة", value: statsQuery.data?.unread ?? 0, icon: MessageSquareText }].map(item => (
            <div key={item.label} className="rounded-2xl border border-blue-100 bg-white p-4 shadow-sm">
              <item.icon className="mb-4 size-5 text-blue-600" />
              <p className="text-2xl font-bold text-slate-900">{item.value}</p>
              <p className="mt-1 text-xs text-slate-500">{item.label}</p>
            </div>
          ))}
        </section>
      )}

      <section className="grid min-h-[620px] gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="flex min-h-0 flex-col overflow-hidden rounded-3xl border border-blue-100 bg-white shadow-[0_16px_55px_-28px_rgba(30,64,175,0.28)]">
          <div className="border-b border-blue-50 p-4">
            <div className="relative">
              <Search className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <Input value={search} onChange={event => setSearch(event.target.value)} placeholder="ابحث بالاسم أو الرسالة..." className="rounded-xl border-slate-200 pr-9 text-right focus-visible:ring-blue-500" />
            </div>
            <Select value={status} onValueChange={value => setStatus(value as StatusFilter)}>
              <SelectTrigger className="mt-3 rounded-xl border-slate-200 text-right"><SelectValue placeholder="كل الحالات" /></SelectTrigger>
              <SelectContent dir="rtl"><SelectItem value="all">كل الحالات</SelectItem><SelectItem value="open">مفتوحة</SelectItem><SelectItem value="in_progress">قيد المعالجة</SelectItem><SelectItem value="closed">مغلقة</SelectItem></SelectContent>
            </Select>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-2">
            {listQuery.isLoading && <div className="flex h-40 items-center justify-center"><Loader2 className="size-5 animate-spin text-blue-600" /></div>}
            {!listQuery.isLoading && conversations.length === 0 && <div className="p-8 text-center text-sm leading-7 text-slate-400">لا توجد محادثات تطابق هذه المعايير.</div>}
            {conversations.map(conversation => (
              <button key={conversation.id} onClick={() => setActiveId(conversation.id)} className={`w-full rounded-2xl p-4 text-right transition ${activeId === conversation.id ? "bg-blue-50 shadow-sm" : "hover:bg-slate-50"}`}>
                <div className="flex items-center justify-between gap-3"><span className="truncate font-bold text-slate-800">{conversation.guestName}</span><div className="flex items-center gap-2">{conversation.ownerUnread && <span className="size-2 rounded-full bg-blue-600" />}<StatusBadge status={conversation.status} /></div></div>
                <p className="mt-2 line-clamp-1 text-xs leading-5 text-slate-500">{conversation.lastMessagePreview}</p>
                <p className="mt-2 text-[11px] text-slate-400">{formatDate(conversation.lastMessageAt)}</p>
              </button>
            ))}
          </div>
        </aside>

        {detail ? (
          <div className="flex min-h-0 flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-blue-100 bg-white px-4 py-3 shadow-sm">
              <div><p className="font-bold text-slate-800">{detail.conversation.guestName}</p><p className="mt-1 text-xs text-slate-500">بدأ المحادثة في {formatDate(detail.conversation.createdAt)}</p></div>
              <div className="flex items-center gap-2">
                {!isArchive && <Select value={detail.conversation.status} onValueChange={value => updateMutation.mutate({ conversationId: detail.conversation.id, status: value as "open" | "in_progress" | "closed" })}><SelectTrigger className="h-9 w-40 rounded-xl border-slate-200"><SelectValue /></SelectTrigger><SelectContent dir="rtl"><SelectItem value="open">مفتوحة</SelectItem><SelectItem value="in_progress">قيد المعالجة</SelectItem><SelectItem value="closed">مغلقة</SelectItem></SelectContent></Select>}
                {!isArchive && <OwnerOutgoingCall conversationId={detail.conversation.id} disabled={detail.conversation.status === "closed"} />}
                {!isArchive && <Button variant="outline" onClick={() => updateMutation.mutate({ conversationId: detail.conversation.id, archived: true })} disabled={updateMutation.isPending} className="rounded-xl border-slate-200"><Archive className="ml-2 size-4" />أرشفة</Button>}
              </div>
            </div>
            <div className="min-h-0 flex-1">
              <SupportChatThread messages={detail.messages} attachments={detail.attachments} viewer="owner" title={detail.conversation.guestName} subtitle={detail.conversation.issue} disabled={detail.conversation.status === "closed" || isArchive} isSending={sendMutation.isPending || attachmentMutation.isPending} onSend={content => sendMutation.mutate({ conversationId: detail.conversation.id, content })} onSendAttachment={async file => { try { const base64 = await fileToBase64(file); attachmentMutation.mutate({ conversationId: detail.conversation.id, fileName: file.name, mimeType: file.type || "application/octet-stream", base64 }); } catch (error) { toast.error(error instanceof Error ? error.message : "تعذّر تجهيز الملف."); } }} />
            </div>
          </div>
        ) : (
          <div className="flex min-h-[420px] flex-col items-center justify-center rounded-3xl border border-dashed border-blue-200 bg-blue-50/50 p-8 text-center"><MessageSquareText className="mb-4 size-10 text-blue-500" /><h2 className="font-bold text-slate-800">اختر محادثة لعرض تفاصيلها</h2><p className="mt-2 max-w-sm text-sm leading-7 text-slate-500">ستظهر هنا الرسائل الكاملة ومعلومات العميل وأدوات إدارة الحالة.</p></div>
        )}
      </section>
    </div>
  );
}

export default function Dashboard() {
  const [location] = useLocation();
  const content = location === "/dashboard/contacts" ? <Contacts /> : location === "/dashboard/requests" ? <Requests /> : location === "/dashboard/chats" || location === "/dashboard/archive" ? <InboxContent /> : location === "/dashboard/invitations" ? <Invitations /> : location === "/dashboard/calls" ? <CallLogs /> : location === "/dashboard/voice-ai" ? <VoiceStatus /> : location === "/dashboard/voice-models" ? <VoiceModels /> : location === "/dashboard/settings" ? <Settings /> : <OperationsDashboard />;
  return <DashboardLayout>{content}<OwnerCallListener /></DashboardLayout>;
}
