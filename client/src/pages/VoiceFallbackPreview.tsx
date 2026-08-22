import { OwnerVoiceFallbackNotice } from "@/components/OwnerCallListener";
import { PhoneCall } from "lucide-react";

export default function VoiceFallbackPreview() {
  return (
    <main className="min-h-dvh bg-slate-100 p-5" dir="rtl">
      <section className="mx-auto mt-12 w-full max-w-sm overflow-hidden rounded-[1.8rem] border border-blue-200 bg-white shadow-2xl shadow-blue-300/30">
        <div className="border-b border-blue-100 bg-gradient-to-l from-[#155eef] to-[#0b5dcd] px-5 py-4 text-white">
          <div className="flex items-center gap-3">
            <span className="flex size-12 items-center justify-center rounded-2xl bg-white/15"><PhoneCall className="size-6" /></span>
            <div><p className="font-extrabold">مكالمة دعم متصلة</p><p className="mt-0.5 text-xs font-medium text-blue-100">معاينة الرجوع الآمن للصوت الطبيعي</p></div>
          </div>
        </div>
        <div className="p-5">
          <p className="text-sm text-slate-500">الحالة الصوتية</p>
          <p className="mt-1 font-bold text-slate-900">استمرار المكالمة بالصوت الطبيعي</p>
          <OwnerVoiceFallbackNotice message="عاد الاتصال إلى الصوت الطبيعي. رصيد ElevenLabs غير كافٍ لتوليد أو تحويل الصوت حالياً." />
        </div>
      </section>
    </main>
  );
}
