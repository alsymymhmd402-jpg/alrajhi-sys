import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { AlertCircle, BellRing, CheckCircle2, ChevronRight, CircleDotDashed, ImagePlus, LayoutTemplate, Loader2, Palette, Save, Smartphone, Type, XCircle } from "lucide-react";
import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useLocation, useRoute } from "wouter";

type Section = "support" | "institution" | "profile" | "application";
type Acceptance = "under_review" | "accepted" | "needs_action" | "not_accepted";
type Position = "top" | "inline" | "bottom";

type Draft = {
  headline: string; bodyText: string; imageUrl: string | null; imagePosition: Position; imageScale: number;
  accentColor: string; textColor: string; displaySection: Section; buttonLabel: string; buttonEnabled: boolean; buttonSection: Section;
  acceptanceStatus: Acceptance; acceptanceTitle: string; acceptanceNote: string; notifyClient: boolean;
  imageBase64?: string; imageFileName?: string; imageMimeType?: string;
};

const emptyDraft: Draft = {
  headline: "متابعة طلبك مع المؤسسة", bodyText: "سيتابع فريق المؤسسة تفاصيل طلبك ويطلعك على أي تحديث مهم.", imageUrl: null, imagePosition: "top", imageScale: 100,
  accentColor: "#128c7e", textColor: "#0f172a", displaySection: "application", buttonLabel: "اطلع على التفاصيل", buttonEnabled: false, buttonSection: "application",
  acceptanceStatus: "under_review", acceptanceTitle: "طلبك قيد المراجعة", acceptanceNote: "يجري فريق المؤسسة مراجعة بيانات الطلب.", notifyClient: true,
};

const sectionLabel: Record<Section, string> = { support: "خدمة العملاء", institution: "المؤسسة", profile: "ملفي", application: "القبول" };
const statusMeta: Record<Acceptance, { label: string; icon: typeof CircleDotDashed; className: string; clientText: string }> = {
  under_review: { label: "قيد المراجعة", icon: CircleDotDashed, className: "border-amber-200 bg-amber-50 text-amber-800", clientText: "يجري فريق المؤسسة مراجعة طلبك" },
  accepted: { label: "تم القبول", icon: CheckCircle2, className: "border-emerald-200 bg-emerald-50 text-emerald-800", clientText: "تمت الموافقة المبدئية على طلبك" },
  needs_action: { label: "مطلوب إجراء", icon: AlertCircle, className: "border-blue-200 bg-blue-50 text-blue-800", clientText: "هناك خطوة مطلوبة لإكمال المتابعة" },
  not_accepted: { label: "غير مقبول حالياً", icon: XCircle, className: "border-rose-200 bg-rose-50 text-rose-800", clientText: "تعذر قبول الطلب في مرحلته الحالية" },
};

const toDraft = (value: Omit<Partial<Draft>, "bodyText" | "acceptanceNote"> & { bodyText?: string | null; acceptanceNote?: string | null }): Draft => ({ ...emptyDraft, ...value, bodyText: value.bodyText ?? "", acceptanceNote: value.acceptanceNote ?? "" });
const base64FromFile = (file: File) => new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result).split(",")[1] ?? ""); reader.onerror = () => reject(new Error("تعذر قراءة الصورة.")); reader.readAsDataURL(file); });

export default function ClientExperienceStudio() {
  const [, params] = useRoute("/dashboard/contacts/:contactId/experience");
  const contactId = Number(params?.contactId ?? 0);
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const profile = trpc.clientExperience.ownerGet.useQuery({ contactId }, { enabled: Number.isInteger(contactId) && contactId > 0 });
  const contact = trpc.contacts.detail.useQuery({ id: contactId }, { enabled: Number.isInteger(contactId) && contactId > 0 });
  const initializedVersion = useRef<number | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [previewSection, setPreviewSection] = useState<Section>("application");

  useEffect(() => {
    if (!profile.data || initializedVersion.current === profile.data.version) return;
    initializedVersion.current = profile.data.version;
    setDraft(toDraft(profile.data));
  }, [profile.data]);

  const save = trpc.clientExperience.ownerSave.useMutation({
    onSuccess: async () => {
      await Promise.all([utils.clientExperience.ownerGet.invalidate({ contactId }), utils.contacts.detail.invalidate({ id: contactId })]);
      setDraft(current => ({ ...current, imageBase64: undefined, imageFileName: undefined, imageMimeType: undefined }));
      toast.success(draft.notifyClient ? "حُفظ التحديث وسيظهر للعميل مع إشعار داخل التطبيق." : "حُفظ تخصيص واجهة العميل.");
    },
    onError: error => toast.error(error.message),
  });

  const status = statusMeta[draft.acceptanceStatus];
  const StatusIcon = status.icon;
  const image = draft.imageBase64 ? `data:${draft.imageMimeType};base64,${draft.imageBase64}` : draft.imageUrl;
  const clientName = contact.data?.contact.displayName ?? "العميل";

  const chooseImage = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/") || file.size > 2 * 1024 * 1024) { toast.error("اختر صورة لا تتجاوز 2 ميغابايت."); return; }
    try { const imageBase64 = await base64FromFile(file); setDraft(current => ({ ...current, imageBase64, imageFileName: file.name, imageMimeType: file.type })); } catch { toast.error("تعذر تجهيز الصورة."); }
  };

  const submit = () => save.mutate({
    contactId, headline: draft.headline.trim(), bodyText: draft.bodyText.trim() || null, imageUrl: draft.imageBase64 ? null : draft.imageUrl,
    imagePosition: draft.imagePosition, imageScale: draft.imageScale, accentColor: draft.accentColor, textColor: draft.textColor, displaySection: draft.displaySection,
    buttonLabel: draft.buttonLabel.trim(), buttonEnabled: draft.buttonEnabled, buttonSection: draft.buttonSection,
    acceptanceStatus: draft.acceptanceStatus, acceptanceTitle: draft.acceptanceTitle.trim(), acceptanceNote: draft.acceptanceNote.trim() || null,
    notifyClient: draft.notifyClient, imageBase64: draft.imageBase64, imageFileName: draft.imageFileName, imageMimeType: draft.imageMimeType,
  });

  if (profile.isLoading || contact.isLoading) return <main className="flex min-h-[65vh] items-center justify-center"><Loader2 className="size-7 animate-spin text-blue-600" /></main>;
  if (!contact.data) return <main className="mx-auto max-w-xl rounded-3xl border border-rose-100 bg-rose-50 p-8 text-center text-rose-800">تعذر العثور على ملف العميل.</main>;

  return <main className="mx-auto max-w-7xl" dir="rtl">
    <header className="relative overflow-hidden rounded-3xl bg-gradient-to-l from-[#0d3584] via-[#155eef] to-[#3b82f6] px-6 py-7 text-white shadow-xl shadow-blue-200"><div className="pointer-events-none absolute -left-12 -top-16 size-56 rounded-full border border-white/15" /><p className="text-xs font-bold tracking-[.18em] text-blue-100">CLIENT EXPERIENCE STUDIO</p><div className="mt-2 flex flex-wrap items-center justify-between gap-4"><div><h1 className="text-2xl font-extrabold">غرفة تخصيص تجربة العميل</h1><p className="mt-1 text-sm text-blue-100">تعديلات محفوظة لهذا العميل فقط: {clientName}</p></div><Button variant="secondary" onClick={() => setLocation("/dashboard/contacts")} className="rounded-xl bg-white/15 text-white hover:bg-white/25 hover:text-white"><ChevronRight className="ml-1 size-4" />العودة للعملاء</Button></div></header>

    <div className="mt-5 grid gap-5 xl:grid-cols-[1.05fr_.95fr]">
      <section className="space-y-5 rounded-3xl border border-blue-100 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between"><div><h2 className="font-extrabold text-slate-900">محرر الواجهة الفردية</h2><p className="mt-1 text-sm text-slate-500">كل حفظ يطبّق على العميل المحدد فقط.</p></div><span className="rounded-xl bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700">إصدار {profile.data?.version ?? 0}</span></div>
        <section className="rounded-2xl border border-slate-100 p-4"><div className="mb-4 flex items-center gap-2"><Type className="size-4 text-blue-600" /><h3 className="font-bold text-slate-800">النصوص والظهور</h3></div><div className="space-y-3"><div><Label htmlFor="experience-headline">العنوان الظاهر للعميل</Label><Input id="experience-headline" value={draft.headline} onChange={event => setDraft({ ...draft, headline: event.target.value })} className="mt-2 h-11 rounded-xl text-right" /></div><div><Label htmlFor="experience-body">النص التوضيحي</Label><Textarea id="experience-body" value={draft.bodyText} onChange={event => setDraft({ ...draft, bodyText: event.target.value })} className="mt-2 min-h-24 rounded-xl text-right" /></div><div className="grid gap-3 sm:grid-cols-2"><div><Label htmlFor="experience-accent">لون البطاقة</Label><div className="mt-2 flex h-11 items-center gap-2 rounded-xl border border-slate-200 px-2"><input id="experience-accent" type="color" value={draft.accentColor} onChange={event => setDraft({ ...draft, accentColor: event.target.value })} className="size-7 rounded border-0 bg-transparent p-0" /><Input value={draft.accentColor} onChange={event => setDraft({ ...draft, accentColor: event.target.value })} className="h-8 border-0 px-1 text-left shadow-none" dir="ltr" /></div></div><div><Label htmlFor="experience-text">لون النص</Label><div className="mt-2 flex h-11 items-center gap-2 rounded-xl border border-slate-200 px-2"><input id="experience-text" type="color" value={draft.textColor} onChange={event => setDraft({ ...draft, textColor: event.target.value })} className="size-7 rounded border-0 bg-transparent p-0" /><Input value={draft.textColor} onChange={event => setDraft({ ...draft, textColor: event.target.value })} className="h-8 border-0 px-1 text-left shadow-none" dir="ltr" /></div></div></div></div></section>
        <section className="rounded-2xl border border-slate-100 p-4"><div className="mb-4 flex items-center gap-2"><ImagePlus className="size-4 text-blue-600" /><h3 className="font-bold text-slate-800">الصورة والموضع</h3></div><div className="grid gap-3 sm:grid-cols-2"><label className="flex min-h-26 cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-blue-200 bg-blue-50/50 p-3 text-center transition hover:bg-blue-50"><ImagePlus className="size-5 text-blue-600" /><span className="mt-2 text-xs font-bold text-blue-700">رفع صورة للعميل</span><span className="mt-1 text-[11px] text-blue-500">PNG أو JPG حتى 2 ميغابايت</span><input type="file" accept="image/*" onChange={chooseImage} className="sr-only" /></label><div className="space-y-3"><div><Label>مكان الصورة</Label><Select value={draft.imagePosition} onValueChange={value => setDraft({ ...draft, imagePosition: value as Position })}><SelectTrigger className="mt-2 h-11 rounded-xl"><SelectValue /></SelectTrigger><SelectContent dir="rtl"><SelectItem value="top">فوق النص</SelectItem><SelectItem value="inline">ضمن البطاقة</SelectItem><SelectItem value="bottom">أسفل النص</SelectItem></SelectContent></Select></div><div><div className="flex justify-between text-xs"><Label>حجم الصورة</Label><span className="font-bold text-blue-700">{draft.imageScale}%</span></div><input type="range" min="60" max="160" value={draft.imageScale} onChange={event => setDraft({ ...draft, imageScale: Number(event.target.value) })} className="mt-3 w-full accent-blue-600" /></div></div></div>{image && <div className="mt-3 flex items-center gap-3 rounded-xl bg-slate-50 p-2"><img src={image} alt="معاينة الصورة" className="size-12 rounded-lg object-cover" /><p className="flex-1 text-xs text-slate-500">الصورة جاهزة للحفظ لهذا العميل.</p><Button size="sm" variant="ghost" onClick={() => setDraft({ ...draft, imageUrl: null, imageBase64: undefined, imageFileName: undefined, imageMimeType: undefined })} className="text-rose-600">إزالة</Button></div>}</section>
        <section className="rounded-2xl border border-slate-100 p-4"><div className="mb-4 flex items-center gap-2"><LayoutTemplate className="size-4 text-blue-600" /><h3 className="font-bold text-slate-800">الموضع وزر الإجراء</h3></div><div className="mb-3"><Label>تظهر البطاقة داخل</Label><Select value={draft.displaySection} onValueChange={value => setDraft({ ...draft, displaySection: value as Section })}><SelectTrigger className="mt-2 h-11 rounded-xl"><SelectValue /></SelectTrigger><SelectContent dir="rtl">{Object.entries(sectionLabel).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select><p className="mt-2 text-xs text-slate-500">اختر الواجهة التي يرى فيها هذا العميل البطاقة المخصصة.</p></div><div className="grid gap-3 sm:grid-cols-[1fr_auto]"><div><Label htmlFor="button-label">نص الزر</Label><Input id="button-label" value={draft.buttonLabel} onChange={event => setDraft({ ...draft, buttonLabel: event.target.value })} className="mt-2 h-11 rounded-xl text-right" /></div><div className="flex items-end gap-2 pb-2"><Switch checked={draft.buttonEnabled} onCheckedChange={buttonEnabled => setDraft({ ...draft, buttonEnabled })} id="button-enabled" /><Label htmlFor="button-enabled">إظهار الزر</Label></div></div><div className="mt-3"><Label>ينتقل الزر إلى</Label><Select value={draft.buttonSection} onValueChange={value => setDraft({ ...draft, buttonSection: value as Section })}><SelectTrigger className="mt-2 h-11 rounded-xl"><SelectValue /></SelectTrigger><SelectContent dir="rtl">{Object.entries(sectionLabel).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></div></section>
        <section className="rounded-2xl border border-slate-100 p-4"><div className="mb-4 flex items-center gap-2"><Palette className="size-4 text-blue-600" /><h3 className="font-bold text-slate-800">حالة القبول والمتابعة</h3></div><div className="grid gap-2 sm:grid-cols-2">{(Object.keys(statusMeta) as Acceptance[]).map(value => { const meta = statusMeta[value]; const Icon = meta.icon; return <button key={value} type="button" onClick={() => setDraft({ ...draft, acceptanceStatus: value, acceptanceTitle: meta.label })} className={`flex items-center gap-3 rounded-xl border p-3 text-right transition ${draft.acceptanceStatus === value ? `${meta.className} ring-2 ring-offset-1 ring-blue-500/50` : "border-slate-100 bg-white text-slate-600 hover:bg-slate-50"}`}><Icon className="size-5" /><span className="text-sm font-bold">{meta.label}</span></button>; })}</div><div className="mt-4 space-y-3"><div><Label htmlFor="acceptance-title">عنوان حالة العميل</Label><Input id="acceptance-title" value={draft.acceptanceTitle} onChange={event => setDraft({ ...draft, acceptanceTitle: event.target.value })} className="mt-2 h-11 rounded-xl text-right" /></div><div><Label htmlFor="acceptance-note">توضيح الحالة للعميل</Label><Textarea id="acceptance-note" value={draft.acceptanceNote} onChange={event => setDraft({ ...draft, acceptanceNote: event.target.value })} className="mt-2 min-h-20 rounded-xl text-right" /></div></div></section>
        <section className="flex flex-col gap-3 rounded-2xl border border-blue-100 bg-blue-50/60 p-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-start gap-3"><BellRing className="mt-0.5 size-5 text-blue-600" /><div><h3 className="font-bold text-blue-950">إشعار تحديث داخل التطبيق</h3><p className="mt-1 text-xs leading-5 text-blue-700">يظهر للعميل كتحديث واجهة ورقم إشعار، وليس كرسالة في المحادثة.</p></div></div><Switch checked={draft.notifyClient} onCheckedChange={notifyClient => setDraft({ ...draft, notifyClient })} aria-label="إرسال إشعار تحديث للعميل" /></section>
        <Button onClick={submit} disabled={save.isPending || !draft.headline.trim() || !draft.acceptanceTitle.trim()} className="h-12 w-full rounded-2xl bg-blue-600 text-base font-extrabold hover:bg-blue-700">{save.isPending ? <Loader2 className="ml-2 size-5 animate-spin" /> : <Save className="ml-2 size-5" />}{draft.notifyClient ? "حفظ وإرسال تحديث للعميل" : "حفظ تخصيص العميل"}</Button>
      </section>

      <aside className="xl:sticky xl:top-5 xl:self-start"><div className="rounded-[2.2rem] bg-slate-950 p-3 shadow-2xl shadow-slate-900/25"><div className="mx-auto mb-2 h-5 w-28 rounded-full bg-slate-800" /><div className="relative min-h-[650px] overflow-hidden rounded-[1.65rem] bg-[#edf3f0] pb-22"><div className="flex items-center justify-between px-5 py-4 text-white" style={{ backgroundColor: draft.accentColor }}><div className="flex items-center gap-2"><span className="flex size-8 items-center justify-center rounded-xl bg-white/15"><Smartphone className="size-4" /></span><div><p className="text-xs font-extrabold">مراسلة المؤسسة</p><p className="mt-0.5 text-[10px] text-white/70">معاينة العميل: {clientName}</p></div></div><BellRing className="size-4 text-white/80" /></div><div className="p-4"><div className={`rounded-2xl border p-4 shadow-sm ${status.className}`}><div className="flex items-center gap-2"><StatusIcon className="size-5" /><p className="text-sm font-extrabold">{draft.acceptanceTitle || status.clientText}</p></div><div className="mt-3 h-1.5 overflow-hidden rounded-full bg-black/10"><div className="h-full rounded-full bg-current" style={{ width: draft.acceptanceStatus === "accepted" ? "100%" : draft.acceptanceStatus === "needs_action" ? "62%" : draft.acceptanceStatus === "not_accepted" ? "34%" : "48%" }} /></div><p className="mt-3 text-xs leading-5">{draft.acceptanceNote || status.clientText}</p></div><article className="mt-4 overflow-hidden rounded-3xl bg-white shadow-sm" style={{ color: draft.textColor }}>{image && draft.imagePosition === "top" && <img src={image} alt="" className="w-full object-cover" style={{ height: `${Math.round(120 * draft.imageScale / 100)}px` }} />}<div className="p-4"><h3 className="text-base font-extrabold">{draft.headline}</h3>{image && draft.imagePosition === "inline" && <img src={image} alt="" className="my-3 w-full rounded-2xl object-cover" style={{ height: `${Math.round(120 * draft.imageScale / 100)}px` }} />}<p className="mt-2 text-xs leading-6 opacity-75">{draft.bodyText || "ستظهر هنا الرسالة المخصصة لهذا العميل فقط."}</p>{draft.buttonEnabled && <button type="button" onClick={() => setPreviewSection(draft.buttonSection)} className="mt-4 w-full rounded-xl px-3 py-2.5 text-xs font-extrabold text-white" style={{ backgroundColor: draft.accentColor }}>{draft.buttonLabel || "اطلع على التفاصيل"}</button>}</div>{image && draft.imagePosition === "bottom" && <img src={image} alt="" className="w-full object-cover" style={{ height: `${Math.round(120 * draft.imageScale / 100)}px` }} />}</article></div><nav className="absolute bottom-0 grid w-full grid-cols-4 gap-1 border-t border-slate-100 bg-white p-2 text-[9px] font-bold text-slate-400">{(Object.keys(sectionLabel) as Section[]).map(section => <button type="button" key={section} onClick={() => setPreviewSection(section)} className={`rounded-xl px-1 py-2 ${previewSection === section ? "bg-emerald-700 text-white" : "hover:bg-slate-50"}`}>{sectionLabel[section]}</button>)}</nav></div></div><p className="mt-3 text-center text-xs text-slate-500">هذه معاينة لنفس العميل؛ لا تغير واجهات العملاء الآخرين.</p></aside>
    </div>
  </main>;
}
