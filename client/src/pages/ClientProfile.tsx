import { ClientBottomNav } from "@/components/ClientBottomNav";
import ClientSessionUnavailable from "@/pages/ClientSessionUnavailable";
import { ClientExperienceSlot } from "@/components/ClientExperienceSlot";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { getClientSession } from "@/lib/clientSession";
import { trpc } from "@/lib/trpc";
import { FileText, Loader2, LockKeyhole, Save, ShieldCheck, UserRound } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useLocation, useRoute } from "wouter";

const logoUrl = "/manus-storage/alwaleed-philanthropies-mark_d87d264e.jpg";
const profileOrbUrl = "/manus-storage/client-profile-orb_3a48419e.png";

export default function ClientProfile() {
  const [, params] = useRoute("/client/:publicId/profile");
  const [, setLocation] = useLocation();
  const publicId = params?.publicId ?? "";
  const accessToken = useMemo(() => publicId ? getClientSession(publicId) : null, [publicId]);
  const utils = trpc.useUtils();
  const profileQuery = trpc.support.guestProfile.useQuery({ publicId, accessToken: accessToken ?? "" }, { enabled: Boolean(publicId && accessToken) });
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [extraData, setExtraData] = useState("");
  useEffect(() => { if (profileQuery.data?.contact) { setEmail(profileQuery.data.contact.email ?? ""); setPhone(profileQuery.data.contact.phone ?? ""); setExtraData(profileQuery.data.contact.extraData ?? ""); } }, [profileQuery.data?.contact]);
  const updateMutation = trpc.support.guestUpdateProfile.useMutation({ onSuccess: async () => { await utils.support.guestProfile.invalidate(); toast.success("تم حفظ بيانات الملف."); }, onError: error => toast.error(error.message) });
  if (!accessToken) return <ClientSessionUnavailable />;
  if (profileQuery.isLoading) return <div className="flex min-h-screen items-center justify-center bg-[#e8efe9]"><Loader2 className="size-7 animate-spin text-[#128c7e]" /></div>;
  if (!profileQuery.data) return <ClientSessionUnavailable />;
  const { conversation, contact } = profileQuery.data;
  const startedAt = new Intl.DateTimeFormat("ar-EG", { dateStyle: "medium" }).format(new Date(conversation.createdAt));
  const save = () => updateMutation.mutate({ publicId, accessToken, email, phone, extraData });
  return <main className="client-viewport bg-[#e8efe9] p-0" dir="rtl"><section className="client-phone-shell flex flex-col bg-white">
    <header className="client-fixed-header overflow-hidden bg-[#075e54] px-5 pb-6 pt-5 text-center text-white"><img src={profileOrbUrl} alt="" aria-hidden="true" className="pointer-events-none absolute -left-12 -top-5 w-44 opacity-25 mix-blend-screen" /><div className="relative"><Avatar className="mx-auto size-20 border-4 border-white/30"><AvatarImage src={contact?.avatarUrl ?? logoUrl} alt="صورة ملف العميل" /><AvatarFallback><UserRound /></AvatarFallback></Avatar><h1 className="mt-3 text-lg font-extrabold">{conversation.guestName}</h1><p className="mt-1 text-xs text-emerald-100">ملف العميل في مراسلة المؤسسة</p></div></header>
    <div className="client-scroll-area flex-1 space-y-4 p-5 pb-28 pt-[11.25rem]"><ClientExperienceSlot publicId={publicId} section="profile" /><section className="rounded-2xl border border-slate-100 bg-slate-50 p-4"><div className="flex items-start gap-3"><FileText className="mt-0.5 size-5 text-[#128c7e]" /><div><p className="text-xs font-bold text-slate-500">موضوع المتابعة</p><p className="mt-1 text-sm leading-6 text-slate-800">{conversation.issue}</p><p className="mt-2 text-xs text-slate-400">بدأت المتابعة: {startedAt}</p></div></div></section><section className="space-y-3 rounded-2xl border border-slate-100 p-4"><div><label className="text-xs font-bold text-slate-600" htmlFor="client-email">البريد الإلكتروني</label><Input id="client-email" dir="ltr" value={email} onChange={event => setEmail(event.target.value)} placeholder="name@example.com" className="mt-1.5 h-11 rounded-xl" /></div><div><label className="text-xs font-bold text-slate-600" htmlFor="client-phone">رقم التواصل</label><Input id="client-phone" dir="ltr" value={phone} onChange={event => setPhone(event.target.value)} placeholder="+966" className="mt-1.5 h-11 rounded-xl" /></div><div><label className="text-xs font-bold text-slate-600" htmlFor="client-note">ملاحظة لفريق المؤسسة</label><Textarea id="client-note" value={extraData} onChange={event => setExtraData(event.target.value)} placeholder="أي تفاصيل تساعد فريق الخدمة على التواصل معك" rows={3} className="mt-1.5 rounded-xl" /></div><Button onClick={save} disabled={updateMutation.isPending} className="h-11 w-full rounded-xl bg-[#128c7e] font-bold hover:bg-[#075e54]"><Save className="ml-2 size-4" />{updateMutation.isPending ? "جارٍ الحفظ…" : "حفظ البيانات"}</Button></section><section className="rounded-2xl bg-emerald-50 p-4"><div className="flex items-start gap-3"><LockKeyhole className="mt-0.5 size-5 text-[#128c7e]" /><div><h2 className="font-bold text-emerald-950">بياناتك خاصة</h2><p className="mt-1 text-sm leading-6 text-emerald-900">لا تظهر معلوماتك إلا لفريق المؤسسة المكلّف بمتابعة طلبك.</p></div></div></section><Button variant="outline" onClick={() => setLocation(`/client/${publicId}/privacy`)} className="h-11 w-full rounded-xl border-emerald-200 text-[#075e54] hover:bg-emerald-50"><ShieldCheck className="ml-2 size-4" />سياسة الخصوصية والأمان</Button></div>
    <ClientBottomNav publicId={publicId} active="profile" />
  </section></main>;
}
