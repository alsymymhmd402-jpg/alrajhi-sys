import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { getClientSession } from "@/lib/clientSession";
import { trpc } from "@/lib/trpc";
import ClientSessionUnavailable from "./ClientSessionUnavailable";
import { ArrowRight, LockKeyhole, MessageCircleMore, ShieldCheck, UserRoundCheck } from "lucide-react";
import { useMemo } from "react";
import { useLocation, useRoute } from "wouter";

const logoUrl = "/manus-storage/alwaleed-philanthropies-mark_d87d264e.jpg";

export default function ClientPrivacy() {
  const [, params] = useRoute("/client/:publicId/privacy");
  const [, setLocation] = useLocation();
  const publicId = params?.publicId ?? "";
  const accessToken = useMemo(() => publicId ? getClientSession(publicId) : null, [publicId]);
  const conversationQuery = trpc.support.guestConversation.useQuery({ publicId, accessToken: accessToken ?? "" }, { enabled: Boolean(publicId && accessToken) });
  if (!accessToken) return <ClientSessionUnavailable />;
  if (!conversationQuery.data) return null;

  return <main className="min-h-screen bg-[#050807] p-0 sm:p-6" dir="rtl"><section className="mx-auto flex min-h-screen max-w-md flex-col overflow-hidden bg-[#080d0c] text-emerald-50 shadow-2xl sm:min-h-[760px] sm:rounded-[2rem]"><header className="flex items-center gap-3 bg-[#075e54] px-4 py-4 text-white"><Button variant="ghost" size="icon" className="size-9 text-white hover:bg-white/15 hover:text-white" onClick={() => setLocation(`/client/${publicId}/profile`)}><ArrowRight className="size-5" /><span className="sr-only">رجوع</span></Button><Avatar className="size-10 border border-white/30"><AvatarImage src={logoUrl} alt="مؤسسة الوليد بن طلال الإنسانية" /><AvatarFallback>م</AvatarFallback></Avatar><div><h1 className="font-bold">الخصوصية والأمان</h1><p className="mt-0.5 text-[11px] text-emerald-100">مراسلة المؤسسة</p></div></header><div className="flex-1 space-y-4 bg-[#080d0c] p-5"><section className="rounded-2xl border border-emerald-900/70 bg-[#0b221b] p-4"><div className="flex items-start gap-3"><span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#123027] text-[#40d7aa]"><ShieldCheck className="size-5" /></span><div><h2 className="font-bold text-emerald-50">خصوصيتك مهمة للمؤسسة</h2><p className="mt-2 text-sm leading-7 text-emerald-100/80">تُستخدم بيانات هذه المحادثة وطلبك لمراجعة الحالة ومساعدتك من فريق خدمة العملاء، خصوصاً عند وجود عدد كبير من الطلبات أو المراسلات التي تحتاج متابعة.</p></div></div></section><section className="space-y-3"><div className="flex items-start gap-3 rounded-2xl border border-[#1e3029] bg-[#101916] p-4"><LockKeyhole className="mt-0.5 size-5 text-[#29b78d]" /><div><h2 className="font-bold text-emerald-50">مساحة محادثة خاصة</h2><p className="mt-1 text-sm leading-6 text-emerald-100/65">لا يفتح هذا الرابط سوى المحادثة المرتبطة بطلبك، ولا يمنحك وصولاً إلى بيانات أو محادثات عملاء آخرين.</p></div></div><div className="flex items-start gap-3 rounded-2xl border border-[#1e3029] bg-[#101916] p-4"><UserRoundCheck className="mt-0.5 size-5 text-[#29b78d]" /><div><h2 className="font-bold text-emerald-50">استخدام بياناتك</h2><p className="mt-1 text-sm leading-6 text-emerald-100/65">يصل فريق خدمة العملاء إلى المعلومات التي ترسلها فقط لمراجعة طلبك والرد عليك وتحسين متابعته.</p></div></div><div className="flex items-start gap-3 rounded-2xl border border-[#1e3029] bg-[#101916] p-4"><MessageCircleMore className="mt-0.5 size-5 text-[#29b78d]" /><div><h2 className="font-bold text-emerald-50">استمرارية المتابعة</h2><p className="mt-1 text-sm leading-6 text-emerald-100/65">تبقى رسائلك في سجل الطلب حتى يتمكن الفريق من استكمال الرد، بما في ذلك عندما تتأخر الاستجابة بسبب كثرة المراسلات.</p></div></div></section><Button onClick={() => setLocation(`/client/${publicId}/chat`)} className="h-12 w-full rounded-xl bg-[#128c7e] font-bold hover:bg-[#075e54]">العودة إلى المراسلة</Button></div></section></main>;
}
