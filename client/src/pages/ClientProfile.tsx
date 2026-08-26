import { ClientBottomNav } from "@/components/ClientBottomNav";
import ClientSessionUnavailable from "@/pages/ClientSessionUnavailable";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { getClientAvatar, getClientSession, saveClientAvatar } from "@/lib/clientSession";
import { trpc } from "@/lib/trpc";
import {
  Camera,
  FileText,
  Loader2,
  LockKeyhole,
  Save,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useLocation, useRoute } from "wouter";

const fileToBase64 = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.onerror = () => reject(new Error("تعذّر قراءة الصورة."));
    reader.readAsDataURL(file);
  });
const avatarChunkSize = 26_000;

export default function ClientProfile() {
  const [, params] = useRoute("/client/:publicId/profile");
  const [, setLocation] = useLocation();
  const publicId = params?.publicId ?? "";
  const accessToken = useMemo(
    () => (publicId ? getClientSession(publicId) : null),
    [publicId]
  );
  const utils = trpc.useUtils();
  const profileQuery = trpc.support.guestProfile.useQuery(
    { publicId, accessToken: accessToken ?? "" },
    { enabled: Boolean(publicId && accessToken) }
  );
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [extraData, setExtraData] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [storedAvatarUrl, setStoredAvatarUrl] = useState<string | null>(() => publicId ? getClientAvatar(publicId) : null);
  useEffect(() => {
    if (profileQuery.data?.contact) {
      setEmail(profileQuery.data.contact.email ?? "");
      setPhone(profileQuery.data.contact.phone ?? "");
      setExtraData(profileQuery.data.contact.extraData ?? "");
      if (profileQuery.data.contact.avatarUrl) {
        saveClientAvatar(publicId, profileQuery.data.contact.avatarUrl);
        setStoredAvatarUrl(profileQuery.data.contact.avatarUrl);
      }
    }
  }, [profileQuery.data?.contact]);
  const updateMutation = trpc.support.guestUpdateProfile.useMutation({
    onSuccess: async () => {
      await utils.support.guestProfile.invalidate();
      toast.success("تم حفظ بيانات الملف.");
    },
    onError: error => toast.error(error.message),
  });
  const avatarBeginMutation = trpc.support.guestAvatarBeginUpload.useMutation();
  const avatarChunkMutation = trpc.support.guestAvatarAppendChunk.useMutation();
  const avatarFinishMutation =
    trpc.support.guestAvatarFinishUpload.useMutation();
  if (!accessToken) return <ClientSessionUnavailable />;
  if (profileQuery.isLoading)
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#050807]">
        <Loader2 className="size-7 animate-spin text-[#29b78d]" />
      </div>
    );
  if (!profileQuery.data) return <ClientSessionUnavailable />;
  const { conversation, contact } = profileQuery.data;
  const startedAt = new Intl.DateTimeFormat("ar-EG", {
    dateStyle: "medium",
  }).format(new Date(conversation.createdAt));
  const save = async () => {
    try {
      if (avatarFile) {
        const encoded = (await fileToBase64(avatarFile))
          .replace(/\+/g, "-")
          .replace(/\//g, "_")
          .replace(/=+$/, "");
        const chunks =
          encoded.match(new RegExp(`.{1,${avatarChunkSize}}`, "g")) ?? [];
        const session = await avatarBeginMutation.mutateAsync({
          publicId,
          accessToken,
          fileName: avatarFile.name,
          mimeType: avatarFile.type,
          size: avatarFile.size,
          totalChunks: chunks.length,
        });
        for (let index = 0; index < chunks.length; index += 1)
          await avatarChunkMutation.mutateAsync({
            publicId,
            accessToken,
            uploadId: session.uploadId,
            index,
            data: chunks[index]!.split("").reverse().join(""),
          });
        const uploaded = await avatarFinishMutation.mutateAsync({
          publicId,
          accessToken,
          uploadId: session.uploadId,
        });
        saveClientAvatar(publicId, uploaded.url);
        setStoredAvatarUrl(uploaded.url);
      }
      await updateMutation.mutateAsync({
        publicId,
        accessToken,
        email,
        phone,
        extraData,
      });
      setAvatarFile(null);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "تعذّر تجهيز صورة الملف."
      );
    }
  };
  return (
    <main className="h-[100dvh] overflow-hidden bg-[#050807] p-0" dir="rtl">
      <section className="flex h-[100dvh] w-full flex-col overflow-hidden bg-[#080d0c] text-emerald-50 shadow-2xl">
        <header className="bg-[#075e54] px-5 pb-6 pt-5 text-center text-white">
          <label className="relative mx-auto block w-fit cursor-pointer">
            <Avatar className="size-20 border-4 border-white/30">
              <AvatarImage
                src={
                  avatarFile
                    ? URL.createObjectURL(avatarFile)
                    : (storedAvatarUrl ?? contact?.avatarUrl ?? undefined)
                }
                alt="صورة ملف العميل"
              />
              <AvatarFallback>
                <UserRound />
              </AvatarFallback>
            </Avatar>
            <span className="absolute -bottom-1 -left-1 flex size-7 items-center justify-center rounded-full border-2 border-[#075e54] bg-[#40d7aa] text-[#063f36]">
              <Camera className="size-3.5" />
            </span>
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
          </label>
          <p className="mt-2 text-[11px] text-emerald-100/80">
            اضغط على الصورة لتحديثها
          </p>
          <h1 className="mt-2 text-lg font-extrabold">
            {conversation.guestName}
          </h1>
          <p className="mt-1 text-xs text-emerald-100">
            ملف العميل في مراسلة المؤسسة
          </p>
        </header>
        <div className="flex-1 space-y-4 overflow-y-auto bg-[#080d0c] p-5 pb-[calc(6rem+env(safe-area-inset-bottom))]">
          <section className="rounded-2xl border border-[#1e3029] bg-[#101916] p-4">
            <div className="flex items-start gap-3">
              <FileText className="mt-0.5 size-5 text-[#29b78d]" />
              <div>
                <p className="text-xs font-bold text-emerald-100/55">
                  موضوع المتابعة
                </p>
                <p className="mt-1 text-sm leading-6 text-emerald-50">
                  {conversation.issue}
                </p>
                <p className="mt-2 text-xs text-emerald-100/40">
                  بدأت المتابعة: {startedAt}
                </p>
              </div>
            </div>
          </section>
          <section className="space-y-3 rounded-2xl border border-[#1e3029] bg-[#0d1412] p-4">
            <div>
              <label
                className="text-xs font-bold text-emerald-100/75"
                htmlFor="client-email"
              >
                البريد الإلكتروني{" "}
                <em className="font-normal text-emerald-100/40">اختياري</em>
              </label>
              <Input
                id="client-email"
                dir="ltr"
                value={email}
                onChange={event => setEmail(event.target.value)}
                placeholder="name@example.com"
                className="mt-1.5 h-11 rounded-xl border-[#254037] bg-[#101a16] text-emerald-50 placeholder:text-emerald-100/30"
              />
            </div>
            <div>
              <label
                className="text-xs font-bold text-emerald-100/75"
                htmlFor="client-phone"
              >
                رقم التواصل
              </label>
              <Input
                id="client-phone"
                dir="ltr"
                value={phone}
                onChange={event => setPhone(event.target.value)}
                placeholder="+966"
                className="mt-1.5 h-11 rounded-xl border-[#254037] bg-[#101a16] text-emerald-50 placeholder:text-emerald-100/30"
              />
            </div>
            <div>
              <label
                className="text-xs font-bold text-emerald-100/75"
                htmlFor="client-note"
              >
                ملاحظة لفريق المؤسسة
              </label>
              <Textarea
                id="client-note"
                value={extraData}
                onChange={event => setExtraData(event.target.value)}
                placeholder="أي تفاصيل تساعد فريق الخدمة على التواصل معك"
                rows={3}
                className="mt-1.5 rounded-xl border-[#254037] bg-[#101a16] text-emerald-50 placeholder:text-emerald-100/30"
              />
            </div>
            <Button
              onClick={save}
              disabled={
                updateMutation.isPending ||
                avatarBeginMutation.isPending ||
                avatarChunkMutation.isPending ||
                avatarFinishMutation.isPending
              }
              className="h-11 w-full rounded-xl bg-[#128c7e] font-bold hover:bg-[#075e54]"
            >
              <Save className="ml-2 size-4" />
              {updateMutation.isPending ||
              avatarBeginMutation.isPending ||
              avatarChunkMutation.isPending ||
              avatarFinishMutation.isPending
                ? "جارٍ الحفظ…"
                : "حفظ البيانات"}
            </Button>
          </section>
          <section className="rounded-2xl border border-emerald-900/70 bg-[#0b221b] p-4">
            <div className="flex items-start gap-3">
              <LockKeyhole className="mt-0.5 size-5 text-[#29b78d]" />
              <div>
                <h2 className="font-bold text-emerald-50">بياناتك خاصة</h2>
                <p className="mt-1 text-sm leading-6 text-emerald-100/75">
                  لا تظهر معلوماتك إلا لفريق المؤسسة المكلّف بمتابعة طلبك.
                </p>
              </div>
            </div>
          </section>
          <Button
            variant="outline"
            onClick={() => setLocation(`/client/${publicId}/privacy`)}
            className="h-11 w-full rounded-xl border-emerald-700 bg-[#0d1412] text-emerald-100 hover:bg-[#123027] hover:text-white"
          >
            <ShieldCheck className="ml-2 size-4" />
            سياسة الخصوصية والأمان
          </Button>
        </div>
        <ClientBottomNav publicId={publicId} active="profile" />
      </section>
    </main>
  );
}
