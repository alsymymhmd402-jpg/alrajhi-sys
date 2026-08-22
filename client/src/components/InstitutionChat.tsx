import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { CheckCheck, FileText, Loader2, Mic, Paperclip, PhoneCall, SendHorizontal, Smile, Square, Video, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

export type InstitutionMessage = { id: number; sender: "guest" | "owner" | "system"; content: string; createdAt: Date | string };
export type InstitutionAttachment = { id: number; messageId: number; url: string; fileName: string; mimeType: string };

type InstitutionChatProps = {
  messages: InstitutionMessage[];
  attachments: InstitutionAttachment[];
  disabled?: boolean;
  isSending?: boolean;
  onSend: (content: string) => void;
  onSendAttachment: (file: File, caption?: string) => void;
  callControl: React.ReactNode;
  onVideoRequest: () => void;
  footer?: React.ReactNode;
};

const logoUrl = "/manus-storage/alwaleed-philanthropies-mark_d87d264e.jpg";
const timeFormatter = new Intl.DateTimeFormat("ar-EG", { hour: "numeric", minute: "2-digit" });

export function InstitutionChat({ messages, attachments, disabled = false, isSending = false, onSend, onSendAttachment, callControl, onVideoRequest, footer }: InstitutionChatProps) {
  const [draft, setDraft] = useState("");
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [messages.length, isSending]);
  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);

  const selectFile = (file?: File) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("حجم المرفق يجب ألا يتجاوز 5 ميغابايت."); return; }
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPendingFile(file);
    setPreviewUrl(file.type.startsWith("image/") ? URL.createObjectURL(file) : null);
  };
  const clearFile = () => { if (previewUrl) URL.revokeObjectURL(previewUrl); setPendingFile(null); setPreviewUrl(null); };
  const submit = (event: React.FormEvent) => { event.preventDefault(); if (!draft.trim() || disabled || isSending) return; onSend(draft.trim()); setDraft(""); };
  const sendFile = () => { if (!pendingFile || disabled || isSending) return; onSendAttachment(pendingFile, draft.trim() || undefined); setDraft(""); clearFile(); };

  const startRecording = async () => {
    if (!navigator.mediaDevices?.getUserMedia) { toast.error("لا يدعم هذا المتصفح تسجيل الصوت."); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : undefined });
      chunksRef.current = [];
      recorder.ondataavailable = event => { if (event.data.size) chunksRef.current.push(event.data); };
      recorder.onstop = () => {
        stream.getTracks().forEach(track => track.stop());
        const type = recorder.mimeType || "audio/webm";
        const audio = new File([new Blob(chunksRef.current, { type })], `ملاحظة-صوتية-${Date.now()}.webm`, { type });
        if (audio.size) onSendAttachment(audio);
        setIsRecording(false);
      };
      recorder.start();
      recorderRef.current = recorder;
      setIsRecording(true);
    } catch { toast.error("يلزم السماح بالوصول إلى الميكروفون لتسجيل ملاحظة صوتية."); }
  };
  const stopRecording = () => recorderRef.current?.state === "recording" && recorderRef.current.stop();

  return <main className="min-h-screen bg-[#e8efe9] p-0 sm:p-6" dir="rtl">
    <section className="mx-auto flex min-h-screen max-w-md flex-col overflow-hidden bg-[#efeae2] shadow-2xl sm:min-h-[760px] sm:rounded-[2rem]">
      <header className="flex items-center justify-between bg-[#075e54] px-4 py-3 text-white shadow-lg">
        <div className="flex min-w-0 items-center gap-3"><Avatar className="size-10 border border-white/30"><AvatarImage src={logoUrl} alt="مؤسسة الوليد بن طلال الإنسانية" /><AvatarFallback>م</AvatarFallback></Avatar><div className="min-w-0"><h1 className="truncate text-sm font-bold">مراسلة المؤسسة</h1><p className="mt-0.5 text-[11px] text-emerald-100">مؤسسة الوليد بن طلال الإنسانية</p></div></div>
        <div className="flex items-center gap-1"><Button type="button" variant="ghost" size="icon" onClick={onVideoRequest} className="size-9 text-white hover:bg-white/15 hover:text-white" aria-label="طلب مكالمة فيديو"><Video className="size-5" /></Button>{callControl}</div>
      </header>

      <div className="flex-1 overflow-y-auto bg-[radial-gradient(circle_at_6%_12%,rgba(22,163,74,.08),transparent_23%),linear-gradient(135deg,#efeae2_25%,#f5f1eb_25%,#f5f1eb_50%,#efeae2_50%,#efeae2_75%,#f5f1eb_75%)] bg-[length:22px_22px] px-3 py-5">
        <div className="mx-auto mb-5 w-fit rounded-lg bg-[#d9fdd3] px-3 py-1 text-[11px] text-[#516352] shadow-sm">تجربة تواصل خاصة وآمنة</div>
        <div className="space-y-2">{messages.map(message => { const mine = message.sender === "guest"; const items = attachments.filter(item => item.messageId === message.id); if (message.sender === "system") return <article key={message.id} className="flex justify-center py-1"><div className="flex max-w-[90%] items-center gap-1.5 rounded-full bg-[#fff4c2] px-3 py-1.5 text-center text-[11px] font-medium text-[#6e5b19] shadow-sm"><PhoneCall className="size-3.5 shrink-0" /><span>{message.content}</span><time className="mr-1 text-[10px] text-[#8b7937]">{timeFormatter.format(new Date(message.createdAt))}</time></div></article>; return <article key={message.id} className={cn("flex", mine ? "justify-start" : "justify-end")}><div className={cn("max-w-[84%] rounded-xl px-3 py-2 shadow-sm", mine ? "rounded-tr-sm bg-[#d9fdd3] text-[#1f2c24]" : "rounded-tl-sm bg-white text-slate-800")}><p className="whitespace-pre-wrap text-sm leading-6">{message.content}</p>{items.map(item => item.mimeType.startsWith("image/") ? <a key={item.id} href={item.url} target="_blank" rel="noreferrer" className="mt-2 block overflow-hidden rounded-lg"><img src={item.url} alt={item.fileName} className="max-h-72 w-full object-cover" /></a> : item.mimeType.startsWith("audio/") ? <audio key={item.id} controls src={item.url} className="mt-2 h-9 max-w-full" /> : <a key={item.id} href={item.url} target="_blank" rel="noreferrer" className="mt-2 flex items-center gap-2 rounded-lg bg-black/5 px-2 py-2 text-xs underline"><FileText className="size-4" />{item.fileName}</a>)}<div className="mt-1 flex items-center justify-end gap-1 text-[10px] text-slate-400"><span>{timeFormatter.format(new Date(message.createdAt))}</span>{mine && <CheckCheck className="size-3.5 text-[#53bdeb]" />}</div></div></article>; })}<div ref={bottomRef} /></div>
      </div>

      <form onSubmit={submit} className="border-t border-black/5 bg-[#f0f2f5] p-2">
        {disabled && <p className="mb-2 rounded-lg bg-amber-50 px-3 py-2 text-center text-xs text-amber-800">تم إغلاق هذه المحادثة من المؤسسة.</p>}
        {pendingFile && <div className="mb-2 flex items-center justify-between gap-2 rounded-xl bg-white p-2 shadow-sm"><div className="flex min-w-0 items-center gap-2">{previewUrl ? <img src={previewUrl} alt="معاينة" className="size-10 rounded-lg object-cover" /> : <FileText className="size-5 text-[#128c7e]" />}<p className="truncate text-xs text-slate-700">{pendingFile.name}</p></div><div className="flex gap-1"><Button type="button" size="sm" variant="ghost" onClick={clearFile}><X className="size-4" /></Button><Button type="button" size="sm" onClick={sendFile} className="bg-[#128c7e] hover:bg-[#075e54]">إرسال</Button></div></div>}
        <div className="flex items-end gap-1"><Button type="button" variant="ghost" size="icon" disabled={disabled || isSending} onClick={() => fileInputRef.current?.click()} className="size-10 shrink-0 text-slate-500 hover:text-[#128c7e]" aria-label="إضافة مرفق"><Paperclip className="size-5" /></Button><input ref={fileInputRef} type="file" accept="image/*,application/pdf,text/*,audio/*" className="hidden" onChange={event => { selectFile(event.target.files?.[0]); event.currentTarget.value = ""; }} /><Button type="button" variant="ghost" size="icon" className="size-9 shrink-0 text-slate-400" aria-label="رمز تعبيري"><Smile className="size-5" /></Button><Textarea value={draft} onChange={event => setDraft(event.target.value)} onKeyDown={event => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); submit(event); } }} placeholder={disabled ? "المحادثة مغلقة" : "اكتب رسالة"} disabled={disabled || isSending || isRecording} rows={1} className="min-h-10 max-h-28 resize-none rounded-2xl border-0 bg-white px-3 py-2 text-right text-sm shadow-sm focus-visible:ring-[#128c7e]" />
          {draft.trim() ? <Button type="submit" disabled={disabled || isSending} size="icon" className="size-10 shrink-0 rounded-full bg-[#128c7e] hover:bg-[#075e54]">{isSending ? <Loader2 className="size-4 animate-spin" /> : <SendHorizontal className="size-4" />}</Button> : <Button type="button" size="icon" disabled={disabled || isSending} onClick={isRecording ? stopRecording : startRecording} className={cn("size-10 shrink-0 rounded-full", isRecording ? "bg-red-600 hover:bg-red-700" : "bg-[#128c7e] hover:bg-[#075e54]")}>{isRecording ? <Square className="size-4 fill-current" /> : <Mic className="size-5" />}</Button>}</div>
      </form>
      {footer}
    </section>
  </main>;
}
