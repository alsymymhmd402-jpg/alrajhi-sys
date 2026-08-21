import { InstitutionChat } from "@/components/InstitutionChat";
import { ClientBottomNav } from "@/components/ClientBottomNav";
import { GuestCallControl } from "@/components/GuestCallControl";
import { GuestIncomingCall } from "@/components/GuestIncomingCall";
import { Button } from "@/components/ui/button";
import { getClientSession } from "@/lib/clientSession";
import { trpc } from "@/lib/trpc";
import ClientSessionUnavailable from "./ClientSessionUnavailable";
import { Loader2, MessageCircleMore } from "lucide-react";
import { useEffect, useMemo, useRef } from "react";
import { toast } from "sonner";
import { useLocation, useRoute } from "wouter";
import { io } from "socket.io-client";

const fileToBase64 = (file: File) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
  reader.onerror = () => reject(new Error("تعذّر قراءة الملف."));
  reader.readAsDataURL(file);
});

export default function GuestChat() {
  const [, legacyParams] = useRoute("/chat/:publicId");
  const [, clientParams] = useRoute("/client/:publicId/chat");
  const [, setLocation] = useLocation();
  const publicId = clientParams?.publicId ?? legacyParams?.publicId ?? "";
  const accessToken = useMemo(() => (publicId ? getClientSession(publicId) : null), [publicId]);
  const utils = trpc.useUtils();
  const knownMessageIdsRef = useRef<Set<number> | null>(null);
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
    if (!publicId || !accessToken) return;
    const socket = io({ path: "/api/realtime", transports: ["websocket"], auth: { role: "guest", publicId, accessToken } });
    socket.on("chat:message", () => utils.support.guestConversation.invalidate());
    socket.io.on("reconnect", () => { utils.support.guestConversation.invalidate(); toast.success("تمت إعادة اتصال المحادثة."); });
    socket.on("connect_error", () => toast.error("تعذّر الاتصال الحي، ستستمر المحادثة عند عودة الشبكة."));
    return () => { socket.disconnect(); };
  }, [accessToken, publicId, utils]);

  useEffect(() => {
    const messages = conversationQuery.data?.messages;
    if (!messages) return;
    if (!knownMessageIdsRef.current) {
      knownMessageIdsRef.current = new Set(messages.map(message => message.id));
      return;
    }
    const newOwnerMessages = messages.filter(message => !knownMessageIdsRef.current?.has(message.id) && message.sender === "owner");
    if (newOwnerMessages.length) toast.success("رسالة جديدة من خدمة العملاء", { description: newOwnerMessages.at(-1)?.content.slice(0, 90) });
    knownMessageIdsRef.current = new Set(messages.map(message => message.id));
  }, [conversationQuery.data?.messages]);

  if (!accessToken) return <ClientSessionUnavailable />;

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
          <Button className="mt-6 rounded-xl bg-[#128c7e]" onClick={() => setLocation("/")}>العودة إلى الصفحة الرئيسية</Button>
        </div>
      </main>
    );
  }

  const { conversation, messages, attachments } = conversationQuery.data;
  return <>
    <InstitutionChat
      messages={messages}
      attachments={attachments}
      disabled={conversation.status === "closed"}
      isSending={sendMutation.isPending || attachmentMutation.isPending}
      onSend={content => sendMutation.mutate({ publicId, accessToken, content })}
      onSendAttachment={async file => {
        try { const base64 = await fileToBase64(file); attachmentMutation.mutate({ publicId, accessToken, fileName: file.name, mimeType: file.type || "application/octet-stream", base64 }); }
        catch (error) { toast.error(error instanceof Error ? error.message : "تعذّر تجهيز الملف."); }
      }}
      callControl={<GuestCallControl publicId={publicId} accessToken={accessToken} disabled={conversation.status === "closed"} compact />}
      onVideoRequest={() => toast.message("يتطلب الاتصال المرئي تفعيل مسار فيديو WebRTC منفصل؛ الاتصال الصوتي متاح الآن.")}
      footer={<ClientBottomNav publicId={publicId} active="support" />}
    />
    <GuestIncomingCall publicId={publicId} accessToken={accessToken} />
  </>;
}
