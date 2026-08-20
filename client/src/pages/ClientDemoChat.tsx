import { InstitutionChat, type InstitutionAttachment, type InstitutionMessage } from "@/components/InstitutionChat";
import { Button } from "@/components/ui/button";
import { Phone } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function ClientDemoChat() {
  const [messages, setMessages] = useState<InstitutionMessage[]>([{ id: 1, sender: "owner", content: "مرحباً بك في مراسلة المؤسسة. كيف يمكننا مساعدتك؟", createdAt: new Date() }]);
  const [attachments, setAttachments] = useState<InstitutionAttachment[]>([]);
  const send = (content: string) => setMessages(current => [...current, { id: Date.now(), sender: "guest", content, createdAt: new Date() }]);
  const sendAttachment = (file: File, caption?: string) => { const messageId = Date.now(); setMessages(current => [...current, { id: messageId, sender: "guest", content: caption || `مرفق تجريبي: ${file.name}`, createdAt: new Date() }]); setAttachments(current => [...current, { id: messageId, messageId, url: URL.createObjectURL(file), fileName: file.name, mimeType: file.type }]); };
  return <InstitutionChat messages={messages} attachments={attachments} onSend={send} onSendAttachment={sendAttachment} callControl={<Button type="button" variant="ghost" size="icon" className="size-9 text-white hover:bg-white/15 hover:text-white" onClick={() => toast.message("يتطلب الاتصال الحي تسجيل دخول هاتفياً حقيقياً.")}><Phone className="size-5" /></Button>} onVideoRequest={() => toast.message("يتطلب الاتصال المرئي تفعيل فيديو WebRTC بعد ربط الدخول الحقيقي.")} />;
}
