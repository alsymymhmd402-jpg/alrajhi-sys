import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import {
  getInviteSession,
  saveClientSession,
  saveInviteSession,
} from "@/lib/clientSession";
import {
  ArrowLeft,
  ArrowRight,
  Camera,
  ChevronLeft,
  Link2,
  Loader2,
  MessageCircleMore,
  ShieldCheck,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useLocation, useRoute } from "wouter";
import { brandAssets } from "@/lib/brandAssets";
const fileToBase64 = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.onerror = () => reject(new Error("تعذّر قراءة الصورة."));
    reader.readAsDataURL(file);
  });

export default function InviteGuest() {
  const [, params] = useRoute("/invite/:code");
  const [, setLocation] = useLocation();
  const code = params?.code ?? "";
  const existingPublicId = useMemo(
    () => (code ? getInviteSession(code) : null),
    [code]
  );
  const [step, setStep] = useState<"profile" | "request">("profile");
  const [guestName, setGuestName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [issue, setIssue] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  useEffect(() => {
    if (existingPublicId) setLocation(`/client/${existingPublicId}`);
  }, [existingPublicId, setLocation]);
  const previewQuery = trpc.invitations.preview.useQuery(
    { code },
    { enabled: Boolean(code && !existingPublicId) }
  );
  const settingsQuery = trpc.operations.settings.useQuery();
  const createConversation = trpc.support.create.useMutation({
    onSuccess: ({ publicId, accessToken }) => {
      saveClientSession(publicId, accessToken);
      saveInviteSession(code, publicId);
      setLocation(`/client/${publicId}`);
    },
    onError: error => toast.error(error.message),
  });

  if (existingPublicId || previewQuery.isLoading)
    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#050807]">
        <img src={brandAssets.institutionGreenSplash} alt="" aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-20" /><Loader2 className="relative size-7 animate-spin text-[#29b78d]" />
      </div>
    );
  if (previewQuery.isError || !previewQuery.data)
    return (
      <main
        className="flex min-h-screen items-center justify-center bg-[#e8efe9] p-5"
        dir="rtl"
      >
        <section className="max-w-sm rounded-[2rem] bg-white p-8 text-center shadow-xl">
          <Link2 className="mx-auto mb-4 size-10 text-[#128c7e]" />
          <h1 className="text-xl font-bold text-slate-900">
            رابط التواصل غير متاح
          </h1>
          <p className="mt-3 text-sm leading-7 text-slate-500">
            قد يكون الرابط غير صحيح أو أُلغي أو انتهت صلاحيته.
          </p>
        </section>
      </main>
    );

  const welcomeMessage =
    settingsQuery.data?.find(
      setting => setting.settingKey === "guest.welcomeMessage"
    )?.settingValue ||
    "تواصل مباشرةً مع فريق خدمة العملاء من خلال هذه المساحة الخاصة.";
  const profileForm = (
    <form
      onSubmit={event => {
        event.preventDefault();
        setStep("request");
      }}
      className="space-y-4"
    >
      <div className="text-center">
        <label className="mx-auto flex size-16 cursor-pointer items-center justify-center overflow-hidden rounded-2xl border border-emerald-800 bg-[#0d241c] text-[#40d7aa] shadow-lg">
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={event => {
              const file = event.target.files?.[0];
              if (!file) return;
              if (file.size > 2 * 1024 * 1024) {
                toast.error("صورة الملف يجب ألا تتجاوز 2 ميغابايت.");
                return;
              }
              setAvatarFile(file);
            }}
          />
          {avatarFile ? (
            <img
              src={URL.createObjectURL(avatarFile)}
              alt="صورة الملف"
              className="size-full object-cover"
            />
          ) : (
            <Camera className="size-7" />
          )}
        </label>
        <p className="mt-2 text-[11px] font-bold text-emerald-100/60">
          صورة شخصية اختيارية
        </p>
        <h1 className="mt-4 text-xl font-extrabold text-white">
          أهلاً بك في مراسلة المؤسسة
        </h1>
        <p className="mt-2 text-sm leading-6 text-emerald-100/65">
          {welcomeMessage}
        </p>
      </div>
      <label className="block">
        <span className="mb-2 block text-sm font-bold text-emerald-100/85">
          الاسم الكامل
        </span>
        <Input
          required
          autoComplete="name"
          value={guestName}
          onChange={event => setGuestName(event.target.value)}
          placeholder="اكتب اسمك"
          className="h-12 rounded-xl border-[#254037] bg-[#101a16] text-right text-emerald-50 placeholder:text-emerald-100/30"
        />
      </label>
      <label className="block">
        <span className="mb-2 block text-sm font-bold text-emerald-100/85">
          رقم الهاتف
        </span>
        <Input
          required
          type="tel"
          autoComplete="tel"
          value={phone}
          onChange={event => setPhone(event.target.value)}
          placeholder="مثال: 05xxxxxxxx"
          className="h-12 rounded-xl border-[#254037] bg-[#101a16] text-right text-emerald-50 placeholder:text-emerald-100/30"
        />
      </label>
      <label className="block">
        <span className="mb-2 block text-sm font-bold text-emerald-100/85">
          البريد الإلكتروني{" "}
          <em className="font-normal text-emerald-100/40">اختياري</em>
        </span>
        <Input
          type="email"
          autoComplete="email"
          value={email}
          onChange={event => setEmail(event.target.value)}
          placeholder="name@example.com"
          className="h-12 rounded-xl border-[#254037] bg-[#101a16] text-right text-emerald-50 placeholder:text-emerald-100/30"
        />
      </label>
      <div className="rounded-xl border border-emerald-900/70 bg-[#0b221b] p-3 text-xs leading-6 text-emerald-100/80">
        تستخدم هذه البيانات للتواصل بخصوص طلبك فقط، وتبقى محمية داخل مؤسسة
        الخدمة.
      </div>
      <Button
        type="submit"
        disabled={!guestName.trim() || !phone.trim()}
        className="h-12 w-full rounded-xl bg-[#128c7e] font-bold hover:bg-[#075e54]"
      >
        متابعة <ChevronLeft className="mr-1 size-4" />
      </Button>
    </form>
  );
  const requestForm = (
    <form
      onSubmit={async event => {
        event.preventDefault();
        createConversation.mutate({
          guestName,
          phone,
          email: email || undefined,
          issue,
          inviteCode: code,
          ...(avatarFile
            ? {
                avatarFileName: avatarFile.name,
                avatarMimeType: avatarFile.type,
                avatarBase64: await fileToBase64(avatarFile),
              }
            : {}),
        });
      }}
      className="space-y-4"
    >
      <div className="text-center">
        <MessageCircleMore className="mx-auto size-8 text-[#40d7aa]" />
        <h1 className="mt-3 text-xl font-extrabold text-white">
          ابدأ مراسلة خدمة العملاء
        </h1>
        <p className="mt-2 text-sm leading-6 text-emerald-100/65">
          ستُفتح لك محادثة حية مع المؤسسة بعد إرسال رسالتك الأولى.
        </p>
      </div>
      <Textarea
        value={issue}
        onChange={event => setIssue(event.target.value)}
        placeholder="كيف يمكن للمؤسسة مساعدتك؟"
        className="min-h-36 resize-none rounded-xl border-[#254037] bg-[#101a16] text-right leading-7 text-emerald-50 placeholder:text-emerald-100/30"
      />
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => setStep("profile")}
          className="h-12 rounded-xl border-emerald-700 bg-[#0d1412] text-emerald-100 hover:bg-[#123027]"
        >
          <ArrowRight className="size-4" />
          <span className="sr-only">رجوع</span>
        </Button>
        <Button
          type="submit"
          disabled={createConversation.isPending || !issue.trim()}
          className="h-12 flex-1 rounded-xl bg-[#128c7e] font-bold hover:bg-[#075e54]"
        >
          {createConversation.isPending ? (
            <Loader2 className="ml-2 size-4 animate-spin" />
          ) : (
            <ArrowLeft className="ml-2 size-4" />
          )}
          فتح المراسلة الحية
        </Button>
      </div>
    </form>
  );

  return (
    <main
      className="relative h-[100dvh] w-full overflow-hidden bg-[#050807] p-0"
      dir="rtl"
    >
      <img src={brandAssets.institutionGreenSplash} alt="" aria-hidden="true" className="pointer-events-none fixed inset-0 h-full w-full object-cover opacity-10" />
      <div className="pointer-events-none fixed inset-0 z-0 bg-[linear-gradient(180deg,rgba(5,8,7,.58),rgba(5,8,7,.94)_88%)]" />
      <section className="relative z-10 flex h-[100dvh] w-full flex-col overflow-hidden border border-[#1e3029] bg-[#080d0c]/90 shadow-[0_24px_60px_-25px_rgba(0,0,0,.75)]">
        <header className="z-20 shrink-0 bg-[#075e54] px-6 py-5 text-white shadow-lg">
          <div className="flex items-center gap-3">
            <img
              src={brandAssets.institutionWordmark}
              alt="مؤسسة الوليد بن طلال الإنسانية"
              className="h-12 w-44 rounded-xl border border-white/15 bg-white/95 object-contain px-2"
            />
            <div>
              <p className="text-base font-bold">مراسلة المؤسسة</p>
              <p className="mt-1 text-xs text-emerald-100">
                مؤسسة الوليد بن طلال الإنسانية
              </p>
            </div>
          </div>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-6 pb-[calc(2rem+env(safe-area-inset-bottom))] sm:p-7">
          {step === "profile" ? profileForm : requestForm}
        </div>
      </section>
    </main>
  );
}
