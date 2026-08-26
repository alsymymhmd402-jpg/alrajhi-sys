import { ClientBottomNav } from "@/components/ClientBottomNav";
import ClientSessionUnavailable from "@/pages/ClientSessionUnavailable";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getClientSession } from "@/lib/clientSession";
import { getClientChatPath } from "@/lib/clientRoutes";
import { primeInstitutionSite } from "@/lib/institutionPreload";
import { brandAssets } from "@/lib/brandAssets";
import { trpc } from "@/lib/trpc";
import {
  ChevronLeft,
  Loader2,
  MessageCircleMore,
  ShieldCheck,
} from "lucide-react";
import { useEffect, useMemo, useRef } from "react";
import { useLocation, useRoute } from "wouter";
import { toast } from "sonner";

const logoUrl = "/manus-storage/alwaleed-philanthropies-mark_d87d264e.jpg";
const formatTime = (value?: Date | string) =>
  value
    ? new Intl.DateTimeFormat("ar-EG", {
        hour: "numeric",
        minute: "2-digit",
      }).format(new Date(value))
    : "";

type ChannelRowProps = {
  icon: React.ReactNode;
  iconTone: string;
  coverUrl: string;
  avatarUrl?: string;
  title: string;
  preview: string;
  meta: string;
  unread?: boolean;
  onClick: () => void;
};
function ChannelRow({
  icon,
  iconTone,
  coverUrl,
  avatarUrl,
  title,
  preview,
  meta,
  unread,
  onClick,
}: ChannelRowProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative flex min-h-28 w-full items-center gap-3 overflow-hidden border-b border-white/10 px-4 py-4 text-right transition hover:bg-white/[.045]"
    >
      <img src={coverUrl} alt="" aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-70" />
      <span className="pointer-events-none absolute inset-0 bg-gradient-to-l from-[#06241f]/95 via-[#06241f]/65 to-[#06241f]/40" />
      <span
        className={`relative flex size-12 shrink-0 items-center justify-center rounded-2xl border border-white/15 shadow-lg ${iconTone}`}
      >
        {avatarUrl ? <img src={avatarUrl} alt="" aria-hidden="true" className="size-full rounded-2xl object-cover" /> : icon}
      </span>
      <span className="relative min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <strong className="truncate text-sm text-[#f4faf8]">{title}</strong>
          <small className="mr-auto shrink-0 text-[10px] text-[#8ba9a0]">
            {meta}
          </small>
        </span>
        <span className="mt-1 flex items-center gap-2">
          <span className="truncate text-xs text-[#9bb4ac]">{preview}</span>
          {unread && (
            <b className="mr-auto flex size-5 shrink-0 items-center justify-center rounded-full bg-[#00a884] text-[10px] text-[#06251f]">
              1
            </b>
          )}
        </span>
      </span>
      <ChevronLeft className="relative size-4 shrink-0 text-[#c5eee3] transition group-hover:-translate-x-1 group-hover:text-[#00d9a9]" />
    </button>
  );
}

export default function ClientMessages() {
  const [, params] = useRoute("/client/:publicId/messages");
  const [, setLocation] = useLocation();
  const publicId = params?.publicId ?? "";
  const accessToken = useMemo(
    () => (publicId ? getClientSession(publicId) : null),
    [publicId]
  );
  const exitAttemptRef = useRef(0);
  useEffect(() => {
    primeInstitutionSite();
  }, []);
  useEffect(() => {
    const pushGuard = () =>
      window.history.pushState(
        { voiceCircleScreen: "messages" },
        "",
        window.location.href
      );
    pushGuard();
    const onBack = () => {
      const now = Date.now();
      if (now - exitAttemptRef.current < 1800) {
        window.removeEventListener("popstate", onBack);
        window.history.back();
        return;
      }
      exitAttemptRef.current = now;
      toast.message("اضغط رجوع مرة أخرى للخروج من التطبيق");
      pushGuard();
    };
    window.addEventListener("popstate", onBack);
    return () => window.removeEventListener("popstate", onBack);
  }, []);
  const institutionQuery = trpc.support.guestConversation.useQuery(
    { publicId, accessToken: accessToken ?? "", channel: "institution" },
    { enabled: Boolean(publicId && accessToken), refetchInterval: 3000 }
  );
  const financeQuery = trpc.support.guestConversation.useQuery(
    { publicId, accessToken: accessToken ?? "", channel: "finance" },
    { enabled: Boolean(publicId && accessToken), refetchInterval: 3000 }
  );
  const followUpQuery = trpc.support.guestConversation.useQuery(
    { publicId, accessToken: accessToken ?? "", channel: "follow_up" },
    { enabled: Boolean(publicId && accessToken), refetchInterval: 3000 }
  );
  const privateOfficeQuery = trpc.support.guestConversation.useQuery(
    { publicId, accessToken: accessToken ?? "", channel: "private_office" },
    { enabled: Boolean(publicId && accessToken), refetchInterval: 3000 }
  );
  const applicationQuery = trpc.support.guestApplications.useQuery(
    { publicId, accessToken: accessToken ?? "" },
    { enabled: Boolean(publicId && accessToken), refetchInterval: 5000 }
  );
  if (!accessToken) return <ClientSessionUnavailable />;
  if (institutionQuery.isLoading)
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0b141a]">
        <Loader2 className="size-7 animate-spin text-[#00a884]" />
      </div>
    );
  const conversation = institutionQuery.data?.conversation;
  const institutionLast = institutionQuery.data?.messages.at(-1);
  const financeLast = financeQuery.data?.messages.at(-1);
  const followUpLast = followUpQuery.data?.messages.at(-1);
  const privateOfficeLast = privateOfficeQuery.data?.messages.at(-1);
  const request = applicationQuery.data?.requests[0];
  return (
    <main
      className="h-[100dvh] overflow-hidden bg-[#07100d] p-0"
      dir="rtl"
    >
      <section className="flex h-[100dvh] w-full flex-col overflow-hidden bg-[#0b141a] shadow-2xl">
        <header className="flex shrink-0 items-center justify-between border-b border-white/10 bg-[#075e54] px-4 py-4 text-white">
          <div className="flex items-center gap-3">
            <Avatar className="size-11 border border-[#34d399]/50">
              <AvatarImage src={logoUrl} alt="مؤسسة الوليد بن طلال الإنسانية" />
              <AvatarFallback>م</AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-base font-extrabold">
                مؤسسة الوليد بن طلال الإنسانية
              </h1>
              <p className="mt-0.5 text-[11px] text-emerald-100">
                خدمة العملاء
              </p>
            </div>
          </div>
          <span className="flex size-9 items-center justify-center rounded-xl bg-white/10 text-emerald-100">
            <MessageCircleMore className="size-5" />
          </span>
        </header>
        <div className="flex shrink-0 items-center gap-2 border-b border-emerald-900/50 bg-[#0b302b] px-4 py-3 text-xs font-bold text-emerald-100">
          <ShieldCheck className="size-4 text-[#5eead4]" />
          خدمة العملاء · قنوات التواصل والمتابعة
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto bg-[#06241f] pb-[calc(6rem+env(safe-area-inset-bottom))]">
          <ChannelRow
            icon={
              <img
                src={logoUrl}
                alt=""
                className="h-full w-full object-cover"
              />
            }
            iconTone="overflow-hidden bg-[#075e54]"
            coverUrl={brandAssets.channelCovers.institution}
            title="خدمة عملاء مؤسسة الوليد بن طلال"
            preview={
              institutionLast?.content || "مرحباً بك، كيف يمكننا مساعدتك؟"
            }
            meta={formatTime(institutionLast?.createdAt) || "الآن"}
            unread={conversation?.status === "open"}
            onClick={() => setLocation(getClientChatPath(publicId))}
          />
          <ChannelRow
            icon={null}
            iconTone="bg-[#0f4a40] text-[#a7f3d0]"
            coverUrl={brandAssets.channelCovers.finance}
            avatarUrl={brandAssets.channelAvatars.finance}
            title="نظام الإدارة المالية"
            preview={
              financeLast?.content ||
              "استفسارات الدعم المالي والعمليات ذات الصلة"
            }
            meta={formatTime(financeLast?.createdAt) || "متاح"}
            onClick={() => setLocation(getClientChatPath(publicId, "finance"))}
          />
          <ChannelRow
            icon={null}
            iconTone="bg-[#16443c] text-[#bbf7d0]"
            coverUrl={brandAssets.channelCovers.followUp}
            avatarUrl={brandAssets.channelAvatars.followUp}
            title="فريق دعم متابعة طلبك"
            preview={
              followUpLast?.content ||
              (request
                ? `${request.requestNumber} · ${request.title}`
                : "ستظهر حالة طلبك وتحديثاته هنا")
            }
            meta={formatTime(followUpLast?.createdAt) || "متابعة"}
            onClick={() =>
              setLocation(getClientChatPath(publicId, "acceptance"))
            }
          />
          <ChannelRow
            icon={null}
            iconTone="bg-[#263c38] text-[#d1fae5]"
            coverUrl={brandAssets.channelCovers.privateOffice}
            avatarUrl={brandAssets.channelAvatars.privateOffice}
            title="المكتب الخاص"
            preview={privateOfficeLast?.content || "تواصل مباشر مع المكتب الخاص للمؤسسة"}
            meta={formatTime(privateOfficeLast?.createdAt) || "متاح"}
            onClick={() => setLocation(getClientChatPath(publicId, "private_office"))}
          />
        </div>
        <ClientBottomNav publicId={publicId} active="support" />
      </section>
    </main>
  );
}
