import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { saveClientSession } from "@/lib/clientSession";
import { ArrowLeft, ArrowRight, ChevronLeft, Link2, Loader2, MessageCircleMore, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useLocation, useRoute } from "wouter";

const logoUrl = "/manus-storage/alwaleed-philanthropies-mark_d87d264e.jpg";

export default function InviteGuest() {
  const [, params] = useRoute("/invite/:code");
  const [, setLocation] = useLocation();
  const code = params?.code ?? "";
  const [step, setStep] = useState<"profile" | "request">("profile");
  const [guestName, setGuestName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [issue, setIssue] = useState("");
  const previewQuery = trpc.invitations.preview.useQuery({ code }, { enabled: Boolean(code) });
  const settingsQuery = trpc.operations.settings.useQuery();
  const createConversation = trpc.support.create.useMutation({
    onSuccess: ({ publicId, accessToken }) => { saveClientSession(publicId, accessToken); setLocation(`/client/${publicId}`); },
    onError: error => toast.error(error.message),
  });

  if (previewQuery.isLoading) return <div className="flex min-h-screen items-center justify-center bg-[#e8efe9]"><Loader2 className="size-7 animate-spin text-[#128c7e]" /></div>;
  if (previewQuery.isError || !previewQuery.data) return <main className="flex min-h-screen items-center justify-center bg-[#e8efe9] p-5" dir="rtl"><section className="max-w-sm rounded-[2rem] bg-white p-8 text-center shadow-xl"><Link2 className="mx-auto mb-4 size-10 text-[#128c7e]" /><h1 className="text-xl font-bold text-slate-900">رابط التواصل غير متاح</h1><p className="mt-3 text-sm leading-7 text-slate-500">قد يكون الرابط غير صحيح أو أُلغي أو انتهت صلاحيته.</p></section></main>;

  const welcomeMessage = settingsQuery.data?.find(setting => setting.settingKey === "guest.welcomeMessage")?.settingValue || "تواصل مباشرةً مع فريق خدمة العملاء من خلال هذه المساحة الخاصة.";
  const profileForm = <form onSubmit={event => { event.preventDefault(); setStep("request"); }} className="space-y-4"><div className="text-center"><span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-emerald-50 text-[#128c7e]"><ShieldCheck className="size-7" /></span><h1 className="mt-4 text-xl font-extrabold text-slate-900">أهلاً بك في مراسلة المؤسسة</h1><p className="mt-2 text-sm leading-6 text-slate-500">{welcomeMessage}</p></div><label className="block"><span className="mb-2 block text-sm font-bold text-slate-700">الاسم الكامل</span><Input required autoComplete="name" value={guestName} onChange={event => setGuestName(event.target.value)} placeholder="اكتب اسمك" className="h-12 rounded-xl text-right" /></label><label className="block"><span className="mb-2 block text-sm font-bold text-slate-700">رقم الهاتف</span><Input required type="tel" autoComplete="tel" value={phone} onChange={event => setPhone(event.target.value)} placeholder="مثال: 05xxxxxxxx" className="h-12 rounded-xl text-right" /></label><label className="block"><span className="mb-2 block text-sm font-bold text-slate-700">البريد الإلكتروني <em className="font-normal text-slate-400">اختياري</em></span><Input type="email" autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="name@example.com" className="h-12 rounded-xl text-right" /></label><div className="rounded-xl bg-emerald-50 p-3 text-xs leading-6 text-emerald-900">تستخدم هذه البيانات للتواصل بخصوص طلبك فقط، وتبقى محمية داخل مؤسسة الخدمة.</div><Button type="submit" disabled={!guestName.trim() || !phone.trim()} className="h-12 w-full rounded-xl bg-[#128c7e] font-bold hover:bg-[#075e54]">متابعة <ChevronLeft className="mr-1 size-4" /></Button></form>;
  const requestForm = <form onSubmit={event => { event.preventDefault(); createConversation.mutate({ guestName, phone, email: email || undefined, issue, inviteCode: code }); }} className="space-y-4"><div className="text-center"><MessageCircleMore className="mx-auto size-8 text-[#128c7e]" /><h1 className="mt-3 text-xl font-extrabold text-slate-900">ابدأ مراسلة خدمة العملاء</h1><p className="mt-2 text-sm leading-6 text-slate-500">ستُفتح لك محادثة حية مع المؤسسة بعد إرسال رسالتك الأولى.</p></div><Textarea value={issue} onChange={event => setIssue(event.target.value)} placeholder="كيف يمكن للمؤسسة مساعدتك؟" className="min-h-36 resize-none rounded-xl border-slate-200 text-right leading-7" /><div className="flex gap-2"><Button type="button" variant="outline" onClick={() => setStep("profile")} className="h-12 rounded-xl"><ArrowRight className="size-4" /><span className="sr-only">رجوع</span></Button><Button type="submit" disabled={createConversation.isPending || !issue.trim()} className="h-12 flex-1 rounded-xl bg-[#128c7e] font-bold hover:bg-[#075e54]">{createConversation.isPending ? <Loader2 className="ml-2 size-4 animate-spin" /> : <ArrowLeft className="ml-2 size-4" />}فتح المراسلة الحية</Button></div></form>;

  return <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,#dff7ec,transparent_40%),#e8efe9] p-4" dir="rtl"><section className="w-full max-w-md overflow-hidden rounded-[2rem] bg-white shadow-[0_24px_60px_-25px_rgba(7,94,84,.35)]"><header className="bg-[#075e54] px-6 py-5 text-white"><div className="flex items-center gap-3"><img src={logoUrl} alt="مؤسسة الوليد بن طلال الإنسانية" className="size-12 rounded-2xl border border-white/25 object-cover" /><div><p className="text-base font-bold">مراسلة المؤسسة</p><p className="mt-1 text-xs text-emerald-100">مؤسسة الوليد بن طلال الإنسانية</p></div></div></header><div className="p-6 sm:p-7">{step === "profile" ? profileForm : requestForm}</div></section></main>;
}
