import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link2, MessageCircleMore, ShieldCheck } from "lucide-react";
import { FormEvent, useState } from "react";
import { useLocation } from "wouter";
import { brandAssets } from "@/lib/brandAssets";

export function invitationCode(value: string) {
  const trimmed = value.trim();
  const match = trimmed.match(/\/invite\/([^/?#]+)/i);
  return (match?.[1] ?? trimmed).replace(/[^A-Za-z0-9_-]/g, "");
}

export default function ClientAccessHub() {
  const [, setLocation] = useLocation();
  const [invite, setInvite] = useState("");
  const code = invitationCode(invite);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (code) setLocation(`/invite/${code}`);
  };

  return <main className="relative flex h-[100dvh] w-full items-center justify-center overflow-hidden bg-[#050807] p-5" dir="rtl"><img src={brandAssets.institutionGreenSplash} alt="" aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-20" /><img src={brandAssets.kingdomWatermark} alt="" aria-hidden="true" className="pointer-events-none absolute left-1/2 top-1/2 size-[min(78vw,28rem)] -translate-x-1/2 -translate-y-1/2 object-contain opacity-[0.07]" /><div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_18%,rgba(18,140,126,.28),transparent_42%),linear-gradient(180deg,rgba(5,8,7,.24),#050807_92%)]" /><section className="relative w-full max-w-lg text-center text-emerald-50"><img src={brandAssets.institutionWordmark} alt="مؤسسة الوليد بن طلال الإنسانية" className="mx-auto mb-7 h-20 w-full max-w-[20rem] rounded-2xl border border-white/10 bg-white/95 object-contain px-5 shadow-2xl" /><div className="mx-auto flex size-24 items-center justify-center rounded-3xl border border-emerald-300/20 bg-[#0d241c]/90 p-3 shadow-2xl shadow-emerald-950/40"><img src={brandAssets.kingdomWatermark} alt="" aria-hidden="true" className="size-full object-contain" /></div><span className="mx-auto mt-6 flex size-12 items-center justify-center rounded-2xl bg-[#0d241c] text-[#47d7aa]"><MessageCircleMore className="size-6" /></span><h1 className="mt-4 text-2xl font-black">خدمة عملاء مؤسسة الوليد بن طلال</h1><p className="mt-3 text-sm leading-7 text-emerald-100/75">أدخل رابط الدعوة أو رمزه لفتح مساحة المراسلة الخاصة بك بأمان.</p><form onSubmit={submit} className="mt-7 space-y-3 rounded-3xl border border-[#1e3029] bg-[#080d0c]/95 p-4 text-right shadow-2xl"><label htmlFor="invite-link" className="text-sm font-bold text-emerald-100">رابط أو رمز الدعوة</label><Input id="invite-link" value={invite} onChange={event => setInvite(event.target.value)} placeholder="ألصق رابط الدعوة هنا" dir="ltr" className="h-12 rounded-xl border-[#254037] bg-[#101a16] text-emerald-50 placeholder:text-emerald-100/30" /><Button type="submit" disabled={!code} className="h-12 w-full rounded-xl bg-[#128c7e] font-bold hover:bg-[#075e54]"><Link2 className="ml-2 size-4" />فتح المراسلة</Button></form><p className="mt-5 flex items-center justify-center gap-2 text-xs leading-6 text-emerald-100/55"><ShieldCheck className="size-4 text-[#47d7aa]" />لا يمنح التطبيق وصولاً إلى أي محادثة أو بيانات من دون رابط دعوة صالح.</p></section></main>;
}
