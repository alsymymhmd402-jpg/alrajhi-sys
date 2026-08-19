import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { FileText, Loader2, Paperclip, SendHorizontal, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export type SupportMessageVisual = {
  id: number;
  sender: "guest" | "owner";
  content: string;
  createdAt: Date | string;
};

export type SupportAttachmentVisual = {
  id: number;
  messageId: number;
  url: string;
  fileName: string;
  mimeType: string;
};

type SupportChatThreadProps = {
  messages: SupportMessageVisual[];
  attachments?: SupportAttachmentVisual[];
  viewer: "guest" | "owner";
  title: string;
  subtitle: string;
  disabled?: boolean;
  isSending?: boolean;
  onSend: (content: string) => void;
  onSendAttachment?: (file: File, caption?: string) => void;
};

const timeFormatter = new Intl.DateTimeFormat("ar-EG", {
  hour: "numeric",
  minute: "2-digit",
});

export function SupportChatThread({
  messages,
  attachments = [],
  viewer,
  title,
  subtitle,
  disabled = false,
  isSending = false,
  onSend,
  onSendAttachment,
}: SupportChatThreadProps) {
  const [draft, setDraft] = useState("");
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, isSending]);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const content = draft.trim();
    if (!content || disabled || isSending) return;
    onSend(content);
    setDraft("");
  };

  const chooseFile = (file?: File) => {
    if (!file) return;
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPendingFile(file);
    setPreviewUrl(file.type.startsWith("image/") ? URL.createObjectURL(file) : null);
  };

  const clearPendingFile = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPendingFile(null);
    setPreviewUrl(null);
  };

  const sendAttachment = () => {
    if (!pendingFile || !onSendAttachment || disabled || isSending) return;
    onSendAttachment(pendingFile, draft.trim() || undefined);
    setDraft("");
    clearPendingFile();
  };

  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);

  return (
    <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-3xl border border-blue-100 bg-white shadow-[0_16px_55px_-24px_rgba(30,64,175,0.3)]" dir="rtl">
      <header className="flex items-center justify-between border-b border-blue-50 bg-gradient-to-l from-blue-50 to-white px-5 py-4">
        <div>
          <h2 className="text-base font-bold text-slate-900">{title}</h2>
          <p className="mt-1 text-xs text-slate-500">{subtitle}</p>
        </div>
        <span className="flex size-10 items-center justify-center rounded-2xl bg-blue-600 text-sm font-bold text-white">VC</span>
      </header>

      <div className="min-h-[360px] flex-1 overflow-y-auto bg-[radial-gradient(circle_at_top_right,rgba(219,234,254,0.45),transparent_34%)] px-4 py-5 sm:px-6">
        {messages.length === 0 ? (
          <div className="flex h-full min-h-[280px] items-center justify-center text-center text-sm text-slate-400">
            لا توجد رسائل بعد. ابدأ المحادثة عند جاهزيتك.
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {messages.map(message => {
              const isMine = message.sender === viewer;
              const messageAttachments = attachments.filter(attachment => attachment.messageId === message.id);
              return (
                <article key={message.id} className={cn("flex max-w-[85%] flex-col gap-1", isMine ? "self-start items-start" : "self-end items-end")}>
                  <div className={cn("rounded-2xl px-4 py-3 text-sm leading-7 shadow-sm", isMine ? "rounded-tr-md bg-blue-600 text-white" : "rounded-tl-md bg-slate-100 text-slate-700")}>
                    {message.content}
                    {messageAttachments.map(attachment => attachment.mimeType.startsWith("image/") ? <a key={attachment.id} href={attachment.url} target="_blank" rel="noreferrer" className="mt-3 block overflow-hidden rounded-xl border border-white/20"><img src={attachment.url} alt={attachment.fileName} className="max-h-64 w-full object-cover" /></a> : <a key={attachment.id} href={attachment.url} target="_blank" rel="noreferrer" className="mt-3 flex items-center gap-2 rounded-xl bg-black/10 px-3 py-2 text-xs underline"><FileText className="size-4" />{attachment.fileName}</a>)}
                  </div>
                  <time className="px-1 text-[11px] text-slate-400">
                    {timeFormatter.format(new Date(message.createdAt))}{isMine ? " · تم الحفظ" : ""}
                  </time>
                </article>
              );
            })}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      <form onSubmit={submit} className="border-t border-blue-50 bg-white p-4 sm:p-5">
        {disabled && <p className="mb-3 rounded-xl bg-slate-100 px-3 py-2 text-xs text-slate-500">هذه المحادثة مغلقة ولا تستقبل رسائل جديدة.</p>}
        {pendingFile && <div className="mb-3 flex items-center justify-between gap-3 rounded-2xl border border-blue-100 bg-blue-50 p-3"><div className="flex min-w-0 items-center gap-3">{previewUrl ? <img src={previewUrl} alt="معاينة المرفق" className="size-12 rounded-xl object-cover" /> : <span className="flex size-12 items-center justify-center rounded-xl bg-white text-blue-600"><FileText className="size-5" /></span>}<div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-700">{pendingFile.name}</p><p className="mt-1 text-xs text-slate-400">معاينة قبل الإرسال</p></div></div><div className="flex gap-2"><Button type="button" variant="outline" size="sm" onClick={clearPendingFile} className="rounded-xl"><X className="size-4" /><span className="sr-only">إزالة</span></Button><Button type="button" size="sm" onClick={sendAttachment} disabled={disabled || isSending} className="rounded-xl bg-blue-600 hover:bg-blue-700">إرسال</Button></div></div>}
        <div className="flex items-end gap-3">
          {onSendAttachment && <><input ref={fileInputRef} type="file" accept="image/*,application/pdf,text/*" className="hidden" onChange={event => { chooseFile(event.target.files?.[0]); event.currentTarget.value = ""; }} /><Button type="button" variant="outline" size="icon" disabled={disabled || isSending} onClick={() => fileInputRef.current?.click()} className="size-11 shrink-0 rounded-2xl border-slate-200"><Paperclip className="size-4" /><span className="sr-only">إرفاق ملف</span></Button></>}
          <Textarea
            value={draft}
            onChange={event => setDraft(event.target.value)}
            onKeyDown={event => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                submit(event);
              }
            }}
            placeholder={disabled ? "تم إغلاق المحادثة" : "اكتب رسالتك هنا..."}
            disabled={disabled || isSending}
            className="min-h-11 max-h-32 resize-none rounded-2xl border-slate-200 bg-slate-50 px-4 py-3 text-right leading-6 focus-visible:ring-blue-500"
            rows={1}
          />
          <Button type="submit" disabled={disabled || isSending || !draft.trim()} className="size-11 shrink-0 rounded-2xl bg-blue-600 shadow-lg shadow-blue-200 hover:bg-blue-700">
            {isSending ? <Loader2 className="size-4 animate-spin" /> : <SendHorizontal className="size-4" />}
            <span className="sr-only">إرسال الرسالة</span>
          </Button>
        </div>
      </form>
    </section>
  );
}
