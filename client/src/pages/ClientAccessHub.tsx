import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link2, MessageCircleMore, ShieldCheck } from "lucide-react";
import { FormEvent, useState } from "react";
import { useLocation } from "wouter";

const logoUrl = "/manus-storage/alwaleed-philanthropies-mark_d87d264e.jpg";

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

  return <main className="flex h-[100dvh] w-full items-center justify-center overflow-hidden bg-[#050807] p-5" dir="rtl"><section className="w-full max-w-lg text-center text-emerald-50"><img src={logoUrl} alt="مؤسسة الوليد بن طلال الإنسانية" className="mx-auto size-24 rounded-3xl border border-white/20 object-cover shadow-2xl" /><span className="mx-auto mt-6 flex size-12 items-center justify-center rounded-2xl bg-[#0d241c] text-[#47d7aa]"><MessageCircleMore className="size-6" /></span><h1 className="mt-4 text-2xl font-black">مراسلة المؤسسة</h1><p className="mt-3 text-sm leading-7 text-emerald-100/75">أدخل رابط الدعوة أو رمزه لفتح مساحة المراسلة الخاصة بك بأمان.</p><form onSubmit={submit} className="mt-7 space-y-3 rounded-3xl border border-[#1e3029] bg-[#080d0c] p-4 text-right shadow-2xl"><label htmlFor="invite-link" className="text-sm font-bold text-emerald-100">رابط أو رمز الدعوة</label><Input id="invite-link" value={invite} onChange={event => setInvite(event.target.value)} placeholder="ألصق رابط الدعوة هنا" dir="ltr" className="h-12 rounded-xl border-[#254037] bg-[#101a16] text-emerald-50 placeholder:text-emerald-100/30" /><Button type="submit" disabled={!code} className="h-12 w-full rounded-xl bg-[#128c7e] font-bold hover:bg-[#075e54]"><Link2 className="ml-2 size-4" />فتح المراسلة</Button></form><p className="mt-5 flex items-center justify-center gap-2 text-xs leading-6 text-emerald-100/55"><ShieldCheck className="size-4 text-[#47d7aa]" />لا يمنح التطبيق وصولاً إلى أي محادثة أو بيانات من دون رابط دعوة صالح.</p></section></main>;
}
