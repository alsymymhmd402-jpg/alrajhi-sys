import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { startLogin } from "@/const";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, CheckCircle2, Headphones, Loader2, MessageCircleHeart, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

/**
 * All content in this page are only for example, replace with your own feature implementation
 * When building pages, remember your instructions in Frontend Workflow, Frontend Best Practices, Design Guide and Common Pitfalls
 */
export default function Home() {
  const [, setLocation] = useLocation();
  const [guestName, setGuestName] = useState("");
  const [issue, setIssue] = useState("");
  const createMutation = trpc.support.create.useMutation({
    onSuccess: ({ publicId, accessToken }) => {
      sessionStorage.setItem(`voice-circle:${publicId}`, accessToken);
      setLocation(`/chat/${publicId}`);
    },
    onError: error => toast.error(error.message),
  });

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    createMutation.mutate({ guestName, issue });
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#f8fbff] text-slate-900" dir="rtl">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[480px] bg-[radial-gradient(circle_at_80%_0%,rgba(96,165,250,0.28),transparent_42%),radial-gradient(circle_at_20%_20%,rgba(191,219,254,0.6),transparent_34%)]" />
      <div className="relative mx-auto max-w-6xl px-5 py-6 sm:px-8">
        <header className="flex items-center justify-between rounded-2xl border border-white/80 bg-white/80 px-4 py-3 shadow-sm backdrop-blur sm:px-5">
          <div className="flex items-center gap-3"><span className="flex size-10 items-center justify-center rounded-2xl bg-blue-600 text-sm font-bold text-white shadow-lg shadow-blue-200">VC</span><div><p className="font-bold">Voice Circle</p><p className="text-xs text-slate-500">دعم أقرب وأوضح</p></div></div>
          <Button variant="ghost" onClick={() => startLogin()} className="rounded-xl text-sm font-semibold text-blue-700 hover:bg-blue-50 hover:text-blue-800">دخول فريق الدعم <ArrowLeft className="mr-2 size-4" /></Button>
        </header>

        <section className="grid items-center gap-12 py-12 lg:grid-cols-[1.08fr_0.92fr] lg:py-20">
          <div className="order-2 lg:order-1">
            <span className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white px-3 py-1.5 text-xs font-semibold text-blue-700"><span className="size-2 rounded-full bg-blue-500" /> فريق دعم متاح لمساعدتك</span>
            <h1 className="mt-6 max-w-2xl text-4xl font-bold leading-[1.25] tracking-tight text-slate-900 sm:text-5xl">نستمع إليك،<br /><span className="text-blue-600">ونتابع مشكلتك حتى الحل.</span></h1>
            <p className="mt-5 max-w-xl text-base leading-8 text-slate-600">ابدأ محادثتك خلال أقل من دقيقة، وستصل رسالتك مباشرةً إلى فريق الدعم من دون إنشاء حساب.</p>
            <div className="mt-8 grid gap-3 sm:grid-cols-3">{[{ icon: Headphones, text: "تواصل مباشر" }, { icon: ShieldCheck, text: "خصوصية محفوظة" }, { icon: CheckCircle2, text: "متابعة واضحة" }].map(item => <div key={item.text} className="flex items-center gap-2 rounded-xl bg-white/75 px-3 py-3 text-sm font-medium text-slate-700 shadow-sm"><item.icon className="size-4 text-blue-600" />{item.text}</div>)}</div>
          </div>

          <section className="order-1 rounded-[2rem] border border-blue-100 bg-white p-6 shadow-[0_24px_80px_-36px_rgba(30,64,175,0.42)] sm:p-8 lg:order-2">
            <div className="mb-6 flex items-start gap-3"><span className="flex size-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-600"><MessageCircleHeart className="size-5" /></span><div><h2 className="font-bold text-slate-900">ابدأ محادثة جديدة</h2><p className="mt-1 text-sm text-slate-500">أخبرنا بما تحتاج إليه وسيتابع معك أحد أعضاء الفريق.</p></div></div>
            <form onSubmit={submit} className="space-y-4">
              <label className="block"><span className="mb-2 block text-sm font-semibold text-slate-700">الاسم</span><Input value={guestName} onChange={event => setGuestName(event.target.value)} placeholder="اكتب اسمك" maxLength={120} className="h-12 rounded-xl border-slate-200 bg-slate-50 px-4 text-right focus-visible:ring-blue-500" /></label>
              <label className="block"><span className="mb-2 block text-sm font-semibold text-slate-700">كيف يمكننا مساعدتك؟</span><Textarea value={issue} onChange={event => setIssue(event.target.value)} placeholder="اكتب وصفاً مختصراً لمشكلتك أو طلبك..." maxLength={4000} className="min-h-32 resize-none rounded-xl border-slate-200 bg-slate-50 px-4 py-3 text-right leading-7 focus-visible:ring-blue-500" /></label>
              <Button type="submit" disabled={createMutation.isPending || !guestName.trim() || !issue.trim()} className="h-12 w-full rounded-xl bg-blue-600 text-base font-bold shadow-lg shadow-blue-200 hover:bg-blue-700">{createMutation.isPending ? <Loader2 className="ml-2 size-4 animate-spin" /> : <ArrowLeft className="ml-2 size-4" />}بدء المحادثة</Button>
              <p className="text-center text-xs leading-6 text-slate-400">لا نطلب منك كلمة مرور أو إنشاء حساب لبدء المحادثة.</p>
            </form>
          </section>
        </section>
      </div>
    </main>
  );
}
