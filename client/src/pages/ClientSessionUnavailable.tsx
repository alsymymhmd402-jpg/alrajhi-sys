import { Button } from "@/components/ui/button";
import { RefreshCw, ShieldCheck } from "lucide-react";
import React from "react";

const logoUrl = "/manus-storage/alwaleed-philanthropies-mark_d87d264e.jpg";

export default function ClientSessionUnavailable() {
  return (
    <main className="flex min-h-screen h-[100dvh] w-full items-center justify-center overflow-hidden bg-[#e8efe9] p-5" dir="rtl">
      <section className="w-full bg-white p-8 text-center shadow-xl shadow-emerald-950/10">
        <img src={logoUrl} alt="مؤسسة الوليد بن طلال الإنسانية" className="mx-auto size-20 rounded-3xl object-cover shadow-sm" />
        <span className="mx-auto mt-5 flex size-11 items-center justify-center rounded-2xl bg-emerald-50 text-[#128c7e]"><ShieldCheck className="size-6" /></span>
        <h1 className="mt-4 text-xl font-extrabold text-slate-900">لا تتوفر جلسة المراسلة على هذا الجهاز</h1>
        <p className="mt-3 text-sm leading-7 text-slate-600">لحماية خصوصيتك، تحتاج إلى فتح رابط الدعوة الذي أرسلته لك المؤسسة على هذا الجهاز. تبقى رسائلك محفوظة في سجل طلبك ولا تُعرض أي بيانات لعملاء آخرين.</p>
        <p className="mt-3 text-xs leading-6 text-slate-400">بعد فتح رابط الدعوة ستعود قائمة مراسلة المؤسسة والمحادثة كما كانت.</p>
        <Button onClick={() => window.location.reload()} className="mt-6 h-12 w-full rounded-xl bg-[#128c7e] font-bold hover:bg-[#075e54]"><RefreshCw className="ml-2 size-4" />إعادة المحاولة</Button>
      </section>
    </main>
  );
}
