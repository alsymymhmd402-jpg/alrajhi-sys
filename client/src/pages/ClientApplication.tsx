import { ClientBottomNav } from "@/components/ClientBottomNav";
import ClientSessionUnavailable from "@/pages/ClientSessionUnavailable";
import {
  BadgeCheck,
  CheckCircle2,
  CircleDot,
  Clock3,
  Loader2,
  MessageCircleMore,
} from "lucide-react";
import {
  getAcceptanceStatus,
  getRequestAcceptanceStatus,
} from "@/lib/clientAcceptance";
import { getClientSession } from "@/lib/clientSession";
import { trpc } from "@/lib/trpc";
import { useMemo } from "react";
import { useRoute } from "wouter";

export default function ClientApplication() {
  const [, params] = useRoute("/client/:publicId/application");
  const publicId = params?.publicId ?? "";
  const accessToken = useMemo(
    () => (publicId ? getClientSession(publicId) : null),
    [publicId]
  );
  const conversationQuery = trpc.support.guestConversation.useQuery(
    { publicId, accessToken: accessToken ?? "" },
    { enabled: Boolean(publicId && accessToken), refetchInterval: 5000 }
  );
  const applicationQuery = trpc.support.guestApplications.useQuery(
    { publicId, accessToken: accessToken ?? "" },
    { enabled: Boolean(publicId && accessToken), refetchInterval: 5000 }
  );
  if (!accessToken) return <ClientSessionUnavailable />;
  if (conversationQuery.isLoading)
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#050807]">
        <Loader2 className="size-7 animate-spin text-[#29b78d]" />
      </div>
    );
  if (!conversationQuery.data) return <ClientSessionUnavailable />;
  const request = applicationQuery.data?.requests[0];
  const current = request
    ? getRequestAcceptanceStatus(request.status)
    : getAcceptanceStatus(conversationQuery.data.conversation.status);
  const Icon =
    current.index === 2 ? BadgeCheck : current.index === 1 ? Clock3 : CircleDot;
  const steps = ["استلام الطلب", "مراجعة المؤسسة", "إغلاق المتابعة"];
  return (
    <main className="h-[100dvh] overflow-hidden bg-[#050807] p-0" dir="rtl">
      <section className="flex h-[100dvh] w-full flex-col overflow-hidden bg-[#080d0c] text-emerald-50 shadow-2xl">
        <header className="bg-[#075e54] px-5 pb-5 pt-5 text-white">
          <h1 className="text-lg font-extrabold">نظام القبول والمتابعة</h1>
          <p className="mt-1 text-xs leading-5 text-emerald-100">
            حالة طلبك الحالية مع مؤسسة الوليد بن طلال الإنسانية
          </p>
        </header>
        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto bg-[#080d0c] p-5 pb-[calc(6rem+env(safe-area-inset-bottom))]">
          <section className="rounded-3xl border border-emerald-900/70 bg-[#0d241c] p-5 text-emerald-50">
            <Icon className="size-9 text-[#47d7aa]" />
            <h2 className="mt-4 text-lg font-extrabold">{current.title}</h2>
            <p className="mt-2 text-sm leading-7 text-emerald-100/75">
              {current.description}
            </p>
          </section>
          {request && (
            <section className="rounded-2xl border border-[#1e3029] bg-[#101916] p-4">
              <p className="text-xs font-bold text-emerald-100/55">
                الطلب المرتبط
              </p>
              <p className="mt-1 text-sm font-bold text-emerald-50">
                {request.title}
              </p>
              <p className="mt-1 text-xs text-emerald-100/40">
                رقم الطلب: {request.requestNumber}
              </p>
            </section>
          )}
          <section className="rounded-2xl border border-[#1e3029] bg-[#101916] p-4">
            <p className="mb-5 text-sm font-bold text-emerald-50">مسار الطلب</p>
            <ol className="space-y-5">
              {steps.map((step, index) => {
                const complete = index <= current.index;
                return (
                  <li key={step} className="flex items-center gap-3">
                    <span
                      className={`flex size-7 shrink-0 items-center justify-center rounded-full ${complete ? "bg-[#128c7e] text-white" : "bg-[#1b2a25] text-emerald-100/45"}`}
                    >
                      {complete ? (
                        <CheckCircle2 className="size-4" />
                      ) : (
                        index + 1
                      )}
                    </span>
                    <span
                      className={`text-sm ${complete ? "font-bold text-emerald-50" : "text-emerald-100/40"}`}
                    >
                      {step}
                    </span>
                  </li>
                );
              })}
            </ol>
          </section>
          <section className="flex items-start gap-3 rounded-2xl border border-[#1e3029] bg-[#0d1412] p-4">
            <MessageCircleMore className="mt-0.5 size-5 text-[#29b78d]" />
            <p className="text-sm leading-6 text-emerald-100/70">
              تصل تفاصيل الطلب والردود من فريق المؤسسة عبر تبويب خدمة العملاء.
              لا تعني حالة المراجعة قبولاً نهائياً ما لم يرد تأكيد صريح من
              المؤسسة.
            </p>
          </section>
        </div>
        <ClientBottomNav publicId={publicId} active="application" />
      </section>
    </main>
  );
}
