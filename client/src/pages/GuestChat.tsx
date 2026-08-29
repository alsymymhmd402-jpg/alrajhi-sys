import { InstitutionChat } from "@/components/InstitutionChat";
import { GuestCallControl } from "@/components/GuestCallControl";
import { GuestIncomingCall } from "@/components/GuestIncomingCall";
import { Button } from "@/components/ui/button";
import { getClientSession } from "@/lib/clientSession";
import { brandAssets } from "@/lib/brandAssets";
import { trpc } from "@/lib/trpc";
import ClientSessionUnavailable from "./ClientSessionUnavailable";
import { Loader2, MessageCircleMore } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
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
  const mode = new URLSearchParams(window.location.search).get("mode");
  const channel = mode === "finance" ? "finance" : mode === "acceptance" ? "follow_up" : mode === "private_office" ? "private_office" : "institution";
  const utils = trpc.useUtils();
  const knownMessageIdsRef = useRef<Set<number> | null>(null);
  const [isAiTyping, setIsAiTyping] = useState(false);
  const notificationSoundRef = useRef<HTMLAudioElement | null>(null);
  const returnToMessages = () => setLocation(`/client/${publicId}/messages`);
  const conversationQuery = trpc.support.guestConversation.useQuery(
    { publicId, accessToken: accessToken ?? "", channel },
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
    socket.on("chat:typing", ({ sender }: { sender: "owner" | "ai" }) => { if (sender === "ai") setIsAiTyping(true); });
    socket.on("chat:message", ({ sender }: { sender: string }) => { if (sender === "ai") setIsAiTyping(false); void utils.support.guestConversation.invalidate(); });
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
    if (newOwnerMessages.length) { toast.success("رسالة جديدة من خدمة العملاء", { description: newOwnerMessages.at(-1)?.content.slice(0, 90) }); notificationSoundRef.current?.play().catch(() => undefined); }
    knownMessageIdsRef.current = new Set(messages.map(message => message.id));
  }, [conversationQuery.data?.messages]);

  if (!accessToken) return <ClientSessionUnavailable />;

  if (conversationQuery.isLoading) {
    return <div className="flex min-h-screen items-center justify-center bg-blue-50" dir="rtl"><Loader2 className="size-7 animate-spin text-blue-600" /></div>;
  }

  if (conversationQuery.isError || !conversationQuery.data) {
    return (
      <main className="flex h-[100dvh] w-full items-center justify-center overflow-hidden bg-blue-50 p-4" dir="rtl">
        <div className="w-full bg-white p-8 text-center shadow-xl shadow-blue-100">
          <MessageCircleMore className="mx-auto mb-4 size-10 text-blue-600" />
          <h1 className="text-xl font-bold text-slate-900">تعذّر فتح المحادثة</h1>
          <p className="mt-3 text-sm leading-7 text-slate-500">قد تكون الجلسة انتهت أو تم فتح الرابط من جهاز مختلف.</p>
          <Button className="mt-6 rounded-xl bg-[#128c7e]" onClick={() => setLocation("/")}>العودة إلى الصفحة الرئيسية</Button>
        </div>
      </main>
    );
  }

  const { conversation, messages, attachments } = conversationQuery.data;
  const financeMode = mode === "finance";
  const acceptanceMode = mode === "acceptance";
  const privateOfficeMode = mode === "private_office";
  const channelIdentity = financeMode
    ? { avatarUrl: brandAssets.channelAvatars.finance, wallpaperUrl: brandAssets.channelCovers.finance }
    : acceptanceMode
      ? { avatarUrl: brandAssets.channelAvatars.followUp, wallpaperUrl: brandAssets.channelCovers.followUp }
      : privateOfficeMode
        ? { avatarUrl: brandAssets.channelAvatars.privateOffice, wallpaperUrl: brandAssets.channelCovers.privateOffice }
        : { avatarUrl: brandAssets.institutionSeal, wallpaperUrl: brandAssets.channelCovers.institution };
  return <>
    <audio ref={notificationSoundRef} preload="auto" src={brandAssets.sounds.notification} />
    <InstitutionChat
      messages={messages}
      attachments={attachments}
      guestName={conversation.guestName}
      title={financeMode ? "نظام الإدارة المالية" : acceptanceMode ? "فريق دعم متابعة طلبك" : privateOfficeMode ? "المكتب الخاص" : "خدمة عملاء مؤسسة الوليد بن طلال"}
      subtitle={financeMode ? "استفسارات الدعم المالي والعمليات ذات الصلة" : acceptanceMode ? "استفسر عن مراحل طلبك وتحديثاته" : privateOfficeMode ? "تواصل مباشر مع المكتب الخاص للمؤسسة" : "فريق خدمة العملاء متاح لمساعدتك"}
      avatarUrl={channelIdentity.avatarUrl}
      wallpaperUrl={channelIdentity.wallpaperUrl}
      onBack={returnToMessages}
      onProfileClick={!financeMode && !acceptanceMode && !privateOfficeMode ? () => setLocation(`/client/${publicId}/institution`) : undefined}
      disabled={conversation.status === "closed"}
      isSending={sendMutation.isPending || attachmentMutation.isPending}
      onSend={content => sendMutation.mutate({ publicId, accessToken, channel, content })}
      onSendAttachment={async (file, caption) => {
        try { const base64 = await fileToBase64(file); attachmentMutation.mutate({ publicId, accessToken, channel, fileName: file.name, mimeType: file.type || "application/octet-stream", base64, caption }); }
        catch (error) { toast.error(error instanceof Error ? error.message : "تعذّر تجهيز الملف."); }
      }}
      callControl={<GuestCallControl publicId={publicId} accessToken={accessToken} disabled={conversation.status === "closed"} compact />}
      isTyping={isAiTyping}
      onVideoRequest={() => toast.message("يتطلب الاتصال المرئي تفعيل مسار فيديو WebRTC منفصل؛ الاتصال الصوتي متاح الآن.")}
    />
    <GuestIncomingCall publicId={publicId} accessToken={accessToken} />
  </>;
}
