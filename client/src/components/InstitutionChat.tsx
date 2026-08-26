import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { brandAssets } from "@/lib/brandAssets";
import {
  ArrowRight,
  CheckCheck,
  FileText,
  Info,
  Loader2,
  Mic,
  MoreVertical,
  Paperclip,
  PhoneCall,
  SendHorizontal,
  Smile,
  Square,
  Video,
  X,
} from "lucide-react";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { toast } from "sonner";

export type InstitutionMessage = {
  id: number;
  sender: "guest" | "owner" | "system";
  content: string;
  createdAt: Date | string;
};
export type InstitutionAttachment = {
  id: number;
  messageId: number;
  url: string;
  fileName: string;
  mimeType: string;
};

type InstitutionChatProps = {
  messages: InstitutionMessage[];
  attachments: InstitutionAttachment[];
  guestName?: string;
  title?: string;
  subtitle?: string;
  avatarUrl?: string;
  wallpaperUrl?: string;
  onBack?: () => void;
  onProfileClick?: () => void;
  disabled?: boolean;
  isSending?: boolean;
  onSend: (content: string) => void;
  onSendAttachment: (file: File, caption?: string) => void;
  callControl: React.ReactNode;
  onVideoRequest: () => void;
  footer?: React.ReactNode;
};

const logoUrl = brandAssets.institutionSeal;
const timeFormatter = new Intl.DateTimeFormat("ar-EG", {
  hour: "numeric",
  minute: "2-digit",
});

export function InstitutionChat({
  messages,
  attachments,
  guestName = "العميل",
  title = "مراسلة المؤسسة",
  subtitle = "فريق خدمة العملاء متاح لمساعدتك",
  avatarUrl = logoUrl,
  wallpaperUrl,
  onBack,
  onProfileClick,
  disabled = false,
  isSending = false,
  onSend,
  onSendAttachment,
  callControl,
  onVideoRequest,
  footer,
}: InstitutionChatProps) {
  const [draft, setDraft] = useState("");
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [keyboardInset, setKeyboardInset] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const messagesPaneRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    const pane = messagesPaneRef.current;
    if (pane) pane.scrollTo({ top: pane.scrollHeight, behavior: "smooth" });
  }, [messages.length, isSending]);
  useEffect(
    () => () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    },
    [previewUrl]
  );
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    const update = () =>
      setKeyboardInset(
        Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop)
      );
    update();
    viewport.addEventListener("resize", update);
    viewport.addEventListener("scroll", update);
    return () => {
      viewport.removeEventListener("resize", update);
      viewport.removeEventListener("scroll", update);
    };
  }, []);

  const selectFile = (file?: File) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("حجم المرفق يجب ألا يتجاوز 5 ميغابايت.");
      return;
    }
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPendingFile(file);
    setPreviewUrl(
      file.type.startsWith("image/") ? URL.createObjectURL(file) : null
    );
  };
  const clearFile = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPendingFile(null);
    setPreviewUrl(null);
  };
  const keepComposerFocused = () => {
    const focus = () => textareaRef.current?.focus({ preventScroll: true });
    focus();
    window.requestAnimationFrame(focus);
    window.setTimeout(focus, 80);
  };
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!draft.trim() || disabled || isSending) return;
    onSend(draft.trim());
    setDraft("");
    keepComposerFocused();
  };
  const sendFile = () => {
    if (!pendingFile || disabled || isSending) return;
    onSendAttachment(pendingFile, draft.trim() || undefined);
    setDraft("");
    clearFile();
  };
  const startRecording = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      toast.error("لا يدعم هذا المتصفح تسجيل الصوت.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported("audio/webm")
          ? "audio/webm"
          : undefined,
      });
      chunksRef.current = [];
      recorder.ondataavailable = event => {
        if (event.data.size) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach(track => track.stop());
        const type = recorder.mimeType || "audio/webm";
        const audio = new File(
          [new Blob(chunksRef.current, { type })],
          `ملاحظة-صوتية-${Date.now()}.webm`,
          { type }
        );
        if (audio.size) onSendAttachment(audio);
        setIsRecording(false);
      };
      recorder.start();
      recorderRef.current = recorder;
      setIsRecording(true);
    } catch {
      toast.error("يلزم السماح بالوصول إلى الميكروفون لتسجيل ملاحظة صوتية.");
    }
  };
  const stopRecording = () =>
    recorderRef.current?.state === "recording" && recorderRef.current.stop();

  const keyboardStyle = {
    "--client-keyboard-inset": `${keyboardInset}px`,
  } as CSSProperties;
  const composerStyle = keyboardInset
    ? { transform: `translateY(-${keyboardInset}px)` }
    : undefined;
  const messagesStyle = keyboardInset
    ? { paddingBottom: `${20 + keyboardInset}px` }
    : undefined;
  return (
    <main
      style={keyboardStyle}
      className="h-[100dvh] overflow-hidden bg-[#050807] p-0"
      dir="rtl"
    >
      <section className="relative flex h-[100dvh] w-full flex-col overflow-hidden bg-[#080d0c] shadow-2xl">
        <header className="z-20 flex shrink-0 items-center justify-between border-b border-white/10 bg-[#0b5e53] px-3 py-2 text-white shadow-lg">
          <div className="flex min-w-0 items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onBack}
              className="size-9 shrink-0 text-white hover:bg-white/15 hover:text-white"
              aria-label="العودة إلى المحادثات"
            >
              <ArrowRight className="size-[18px]" />
            </Button>
            <button type="button" onClick={onProfileClick} className="flex min-w-0 items-center gap-2 text-right" aria-label="فتح ملف المؤسسة">
              <Avatar className="size-9 border border-white/30 shadow-sm">
                <AvatarImage src={avatarUrl} alt={title} />
                <AvatarFallback>م</AvatarFallback>
              </Avatar>
              <span className="min-w-0">
                <h1 className="truncate text-[13px] font-extrabold">{title}</h1>
                <p className="mt-0.5 truncate text-[10px] text-emerald-100">{subtitle}</p>
              </span>
            </button>
          </div>
          <div className="flex items-center gap-0.5">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onVideoRequest}
              className="size-9 text-white hover:bg-white/15 hover:text-white"
              aria-label="طلب مكالمة فيديو"
            >
              <Video className="size-[18px]" />
            </Button>
            {callControl}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() =>
                toast.message("مراسلاتك محفوظة داخل تطبيق المؤسسة فقط.")
              }
              className="size-9 text-white hover:bg-white/15 hover:text-white"
              aria-label="معلومات المحادثة"
            >
              <MoreVertical className="size-[19px]" />
            </Button>
          </div>
        </header>
        <div className="z-10 flex shrink-0 items-center justify-between border-b border-emerald-100 bg-white px-4 py-2">
          <div className="flex min-w-0 items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-full bg-[#e7f7f2] text-xs font-extrabold text-[#087767]">
              {guestName.trim().slice(0, 1) || "ع"}
            </span>
            <span className="truncate text-xs font-bold text-slate-600">
              {guestName}
            </span>
          </div>
          <span className="flex items-center gap-1 text-[10px] font-bold text-[#087767]">
            <span className="size-1.5 rounded-full bg-[#18a876]" />
            تواصل آمن
          </span>
        </div>
        <div
          ref={messagesPaneRef}
          style={{
            ...messagesStyle,
            ...(wallpaperUrl
              ? {
                  backgroundImage: `linear-gradient(rgba(4,14,12,.88), rgba(4,14,12,.92)), url(${wallpaperUrl})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }
              : {}),
          }}
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-[radial-gradient(circle_at_4%_9%,rgba(20,122,103,.18),transparent_24%),linear-gradient(135deg,#0b1512_25%,#09100e_25%,#09100e_50%,#0b1512_50%,#0b1512_75%,#09100e_75%)] bg-[length:24px_24px] px-3 py-5"
        >
          <div className="mx-auto mb-5 flex w-fit items-center gap-1.5 rounded-full border border-emerald-900 bg-[#0e1916]/90 px-3 py-1.5 text-[10px] font-bold text-emerald-100 shadow-sm">
            <Info className="size-3.5 text-[#00b894]" />
            مراسلة خاصة وآمنة مع المؤسسة
          </div>
          <div className="space-y-2.5">
            {messages.map(message => {
              const mine = message.sender === "guest";
              const items = attachments.filter(
                item => item.messageId === message.id
              );
              if (message.sender === "system")
                return (
                  <article
                    key={message.id}
                    className="flex justify-center py-1"
                  >
                    <div className="flex max-w-[90%] items-center gap-1.5 rounded-full border border-amber-900/60 bg-[#29220c] px-3 py-1.5 text-center text-[11px] font-medium text-amber-100 shadow-sm">
                      <PhoneCall className="size-3.5 shrink-0" />
                      <span>{message.content}</span>
                      <time className="mr-1 text-[10px] text-amber-300">
                        {timeFormatter.format(new Date(message.createdAt))}
                      </time>
                    </div>
                  </article>
                );
              return (
                <article
                  key={message.id}
                  className={cn("flex", mine ? "justify-start" : "justify-end")}
                >
                  <div
                    className={cn(
                      "max-w-[85%] rounded-2xl px-3 py-2.5 shadow-[0_4px_14px_rgba(0,0,0,.28)]",
                      mine
                        ? "rounded-tr-md bg-[#0f6a5e] text-white"
                        : "rounded-tl-md border border-[#1b2a25] bg-[#111917] text-emerald-50"
                    )}
                  >
                    <p className="whitespace-pre-wrap text-sm leading-6">
                      {message.content}
                    </p>
                    {items.map(item =>
                      item.mimeType.startsWith("image/") ? (
                        <a
                          key={item.id}
                          href={item.url}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-2 block overflow-hidden rounded-xl"
                        >
                          <img
                            src={item.url}
                            alt={item.fileName}
                            className="max-h-72 w-full object-cover"
                          />
                        </a>
                      ) : item.mimeType.startsWith("audio/") ? (
                        <audio
                          key={item.id}
                          controls
                          src={item.url}
                          className="mt-2 h-9 max-w-full"
                        />
                      ) : (
                        <a
                          key={item.id}
                          href={item.url}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-2 flex items-center gap-2 rounded-lg bg-black/20 px-2 py-2 text-xs underline"
                        >
                          <FileText className="size-4" />
                          {item.fileName}
                        </a>
                      )
                    )}
                    <div className="mt-1.5 flex items-center justify-end gap-1 text-[10px] text-emerald-200/60">
                      <span>
                        {timeFormatter.format(new Date(message.createdAt))}
                      </span>
                      {mine && (
                        <CheckCheck className="size-3.5 text-[#67e8f9]" />
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
            <div ref={bottomRef} />
          </div>
        </div>
        <form
          onSubmit={submit}
          style={composerStyle}
          className="z-20 shrink-0 border-t border-[#1c2b26] bg-[#0c1311] p-2.5 shadow-[0_-8px_20px_rgba(0,0,0,.28)] transition-transform duration-150"
        >
          {disabled && (
            <p className="mb-2 rounded-xl bg-amber-950/70 px-3 py-2 text-center text-xs text-amber-100">
              تم إغلاق هذه المحادثة من المؤسسة.
            </p>
          )}
          {pendingFile && (
            <div className="mb-2 flex items-center justify-between gap-2 rounded-xl border border-emerald-800 bg-[#0f221c] p-2">
              <div className="flex min-w-0 items-center gap-2">
                {previewUrl ? (
                  <img
                    src={previewUrl}
                    alt="معاينة"
                    className="size-10 rounded-lg object-cover"
                  />
                ) : (
                  <FileText className="size-5 text-[#29b78d]" />
                )}
                <p className="truncate text-xs text-emerald-50">
                  {pendingFile.name}
                </p>
              </div>
              <div className="flex gap-1">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={clearFile}
                >
                  <X className="size-4" />
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={sendFile}
                  className="bg-[#128c7e] hover:bg-[#075e54]"
                >
                  إرسال
                </Button>
              </div>
            </div>
          )}
          <div className="flex items-end gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled={disabled || isSending}
              onClick={() => fileInputRef.current?.click()}
              className="size-10 shrink-0 rounded-full text-emerald-200 hover:bg-emerald-950 hover:text-[#45d6aa]"
              aria-label="إضافة مرفق"
            >
              <Paperclip className="size-5" />
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,application/pdf,text/*,audio/*"
              className="hidden"
              onChange={event => {
                selectFile(event.target.files?.[0]);
                event.currentTarget.value = "";
              }}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-9 shrink-0 rounded-full text-emerald-200 hover:bg-emerald-950 hover:text-[#45d6aa]"
              onClick={() =>
                toast.message("لوحة الرموز التعبيرية متاحة في شريط الكتابة.")
              }
              aria-label="رمز تعبيري"
            >
              <Smile className="size-5" />
            </Button>
            <Textarea
              ref={textareaRef}
              value={draft}
              onChange={event => setDraft(event.target.value)}
              onKeyDown={event => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  submit(event);
                }
              }}
              placeholder={disabled ? "المحادثة مغلقة" : "اكتب رسالة"}
              disabled={disabled || isRecording}
              rows={1}
              className="min-h-10 max-h-28 resize-none border border-[#1b2d27] bg-[#121c18] px-3 py-2 text-right text-sm text-emerald-50 shadow-inner placeholder:text-emerald-100/40 focus-visible:ring-[#128c7e]"
            />
            {draft.trim() ? (
              <Button
                type="submit"
                onPointerDown={event => event.preventDefault()}
                disabled={disabled || isSending}
                size="icon"
                className="size-10 shrink-0 rounded-full bg-[#128c7e] shadow-lg shadow-emerald-950 hover:bg-[#075e54]"
              >
                {isSending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <SendHorizontal className="size-4" />
                )}
              </Button>
            ) : (
              <Button
                type="button"
                size="icon"
                disabled={disabled || isSending}
                onClick={isRecording ? stopRecording : startRecording}
                className={cn(
                  "size-10 shrink-0 rounded-full",
                  isRecording
                    ? "bg-red-600 hover:bg-red-700"
                    : "bg-[#128c7e] shadow-lg shadow-emerald-950 hover:bg-[#075e54]"
                )}
              >
                {isRecording ? (
                  <Square className="size-4 fill-current" />
                ) : (
                  <Mic className="size-5" />
                )}
              </Button>
            )}
          </div>
        </form>
        {footer}
      </section>
    </main>
  );
}
