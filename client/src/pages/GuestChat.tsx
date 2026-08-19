import { SupportChatThread } from "@/components/SupportChatThread";
import { GuestCallControl } from "@/components/GuestCallControl";
import { GuestIncomingCall } from "@/components/GuestIncomingCall";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { ArrowRight, Loader2, MessageCircleMore } from "lucide-react";
import { useEffect, useMemo } from "react";
import { toast } from "sonner";
import { Link, useLocation, useRoute } from "wouter";
import { io } from "socket.io-client";

const statusLabels = { open: "مفتوحة", in_progress: "قيد المعالجة", closed: "مغلقة" };

const fileToBase64 = (file: File) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
  reader.onerror = () => reject(new Error("تعذّر قراءة الملف."));
  reader.readAsDataURL(file);
});

export default function GuestChat() {
  const [, params] = useRoute("/chat/:publicId");
  const [, setLocation] = useLocation();
  const publicId = params?.publicId ?? "";
  const accessToken = useMemo(() => (publicId ? sessionStorage.getItem(`voice-circle:${publicId}`) : null), [publicId]);
  const utils = trpc.useUtils();
  const conversationQuery = trpc.support.guestConversation.useQuery(
    { publicId, accessToken: accessToken ?? "" },
    { enabled: Boolean(publicId && accessToken), refetchInterval: 2500 },
  );
  const sendMutation = trpc.support.guestSend.useMutation({
    onSuccess: () => {
      utils.support.guestConversation.invalidate();
    },
    onError: error => toast.error(error.message),
  });
  const attachmentMutation = trpc.support.guestSendAttachment.useMutation({
    onSuccess: () => { utils.support.guestConversation.invalidate(); toast.success("تم إرسال الملف."); },
    onError: error => toast.error(error.message),
  });

  useEffect(() => {
    if (publicId && !accessToken) setLocation("/invite/session-unavailable");
  }, [accessToken, publicId, setLocation]);

  useEffect(() => {
    if (!publicId || !accessToken) return;
    const socket = io({ path: "/api/realtime", transports: ["websocket"], auth: { role: "guest", publicId, accessToken } });
    socket.on("chat:message", () => utils.support.guestConversation.invalidate());
    socket.io.on("reconnect", () => { utils.support.guestConversation.invalidate(); toast.success("تمت إعادة اتصال المحادثة."); });
    socket.on("connect_error", () => toast.error("تعذّر الاتصال الحي، ستستمر المحادثة عند عودة الشبكة."));
    return () => { socket.disconnect(); };
  }, [accessToken, publicId, utils]);

  if (!accessToken) return null;

  if (conversationQuery.isLoading) {
    return <div className="flex min-h-screen items-center justify-center bg-blue-50" dir="rtl"><Loader2 className="size-7 animate-spin text-blue-600" /></div>;
  }

  if (conversationQuery.isError || !conversationQuery.data) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-blue-50 p-4" dir="rtl">
        <div className="max-w-md rounded-3xl bg-white p-8 text-center shadow-xl shadow-blue-100">
          <MessageCircleMore className="mx-auto mb-4 size-10 text-blue-600" />
          <h1 className="text-xl font-bold text-slate-900">تعذّر فتح المحادثة</h1>
          <p className="mt-3 text-sm leading-7 text-slate-500">قد تكون الجلسة انتهت أو تم فتح الرابط من جهاز مختلف.</p>
          <Button asChild className="mt-6 rounded-xl bg-blue-600"><Link href="/">بدء محادثة جديدة</Link></Button>
        </div>
      </main>
    );
  }

  const { conversation, messages, attachments } = conversationQuery.data;
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-5 sm:px-8 sm:py-8" dir="rtl">
      <div className="mx-auto flex min-h-[calc(100vh-2.5rem)] max-w-4xl flex-col gap-4">
        <header className="flex flex-wrap items-center justify-between gap-3 px-1">
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-blue-700 hover:text-blue-900"><ArrowRight className="size-4" /> دعم Voice Circle</Link>
          <div className="flex items-center gap-2"><Badge className="border-0 bg-blue-100 px-3 py-1 text-blue-700 hover:bg-blue-100">{statusLabels[conversation.status]}</Badge><GuestCallControl publicId={publicId} accessToken={accessToken} disabled={conversation.status === "closed"} /></div>
        </header>
        <SupportChatThread
          messages={messages}
          viewer="guest"
          title={`مرحباً ${conversation.guestName}`}
          subtitle="فريق الدعم يتابع طلبك، وستظهر الردود هنا تلقائياً."
          disabled={conversation.status === "closed"}
          attachments={attachments}
          isSending={sendMutation.isPending || attachmentMutation.isPending}
          onSend={content => sendMutation.mutate({ publicId, accessToken, content })}
          onSendAttachment={async file => {
            try {
              const base64 = await fileToBase64(file);
              attachmentMutation.mutate({ publicId, accessToken, fileName: file.name, mimeType: file.type || "application/octet-stream", base64 });
            } catch (error) { toast.error(error instanceof Error ? error.message : "تعذّر تجهيز الملف."); }
          }}
        />
        <GuestIncomingCall publicId={publicId} accessToken={accessToken} />
      </div>
    </main>
  );
}
