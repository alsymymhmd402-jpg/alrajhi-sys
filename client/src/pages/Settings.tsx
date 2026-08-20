import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { Bell, Globe2, Loader2, Mic, ShieldCheck, UserRound } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

type SettingDraft = {
  platform_name: string; owner_name: string; owner_avatar_url: string; welcome_message: string;
  guest_require_email: boolean; guest_show_phone: boolean; guest_show_extra_data: boolean;
  invite_default_type: "reusable" | "one_time"; communication_chat: boolean; communication_calls: boolean; communication_notifications: boolean;
};

const initialDraft: SettingDraft = { platform_name: "Voice Circle", owner_name: "فريق الدعم", owner_avatar_url: "", welcome_message: "مرحباً، نجهّز مساحة دعم آمنة لك.", guest_require_email: true, guest_show_phone: true, guest_show_extra_data: true, invite_default_type: "reusable", communication_chat: true, communication_calls: true, communication_notifications: true };
const bool = (value?: string) => value !== "false";

export default function Settings() {
  const utils = trpc.useUtils();
  const settingsQuery = trpc.operations.settings.useQuery();
  const save = trpc.operations.setSetting.useMutation();
  const [draft, setDraft] = useState<SettingDraft>(initialDraft);
  const [isSaving, setIsSaving] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "success" | "error">("idle");
  const settings = useMemo(() => Object.fromEntries((settingsQuery.data ?? []).map(setting => [setting.settingKey, setting.settingValue])), [settingsQuery.data]);

  useEffect(() => {
    if (!settingsQuery.data) return;
    setDraft(current => ({ ...current, platform_name: settings.platform_name ?? current.platform_name, owner_name: settings.owner_name ?? current.owner_name, owner_avatar_url: settings.owner_avatar_url ?? current.owner_avatar_url, welcome_message: settings.welcome_message ?? current.welcome_message, guest_require_email: bool(settings.guest_require_email), guest_show_phone: bool(settings.guest_show_phone), guest_show_extra_data: bool(settings.guest_show_extra_data), invite_default_type: settings.invite_default_type === "one_time" ? "one_time" : "reusable", communication_chat: bool(settings.communication_chat), communication_calls: bool(settings.communication_calls), communication_notifications: bool(settings.communication_notifications) }));
  }, [settingsQuery.data, settings]);

  const update = <K extends keyof SettingDraft>(key: K, value: SettingDraft[K]) => { setSaveState("idle"); setDraft(current => ({ ...current, [key]: value })); };
  const saveDraft = async () => {
    try {
      setIsSaving(true); setSaveState("saving");
      await Promise.all(Object.entries(draft).map(([key, value]) => save.mutateAsync({ key, value: String(value) })));
      await Promise.all([utils.operations.settings.invalidate(), utils.operations.guestExperience.invalidate()]);
      setSaveState("success"); toast.success("تم حفظ جميع إعدادات غرفة العمليات.");
    } catch (error) {
      setSaveState("error"); toast.error(error instanceof Error ? error.message : "تعذّر حفظ الإعدادات.");
    } finally { setIsSaving(false); }
  };
  const toggle = (key: "guest_require_email" | "guest_show_phone" | "guest_show_extra_data" | "communication_chat" | "communication_calls" | "communication_notifications", label: string) => <label className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700"><span>{label}</span><input type="checkbox" checked={draft[key]} onChange={event => update(key, event.target.checked)} className="size-4 accent-blue-600" /></label>;
  const statusText = saveState === "saving" ? "جارٍ حفظ جميع الإعدادات…" : saveState === "success" ? "تم حفظ جميع الإعدادات بنجاح." : saveState === "error" ? "تعذّر حفظ الإعدادات. راجع الاتصال ثم أعد المحاولة." : "";
  const statusColor = saveState === "success" ? "text-emerald-700" : saveState === "error" ? "text-red-700" : "text-blue-700";

  if (settingsQuery.isLoading) return <div className="flex justify-center p-12"><Loader2 className="size-6 animate-spin text-blue-600" /></div>;
  return <main className="mx-auto max-w-5xl" dir="rtl">
    <header className="rounded-3xl bg-gradient-to-l from-blue-700 via-blue-600 to-blue-500 px-6 py-7 text-white shadow-xl shadow-blue-200"><p className="text-xs font-bold tracking-[.16em] text-blue-100">OWNER SETTINGS</p><h1 className="mt-2 text-2xl font-bold">إعدادات غرفة العمليات</h1><p className="mt-1 text-sm text-blue-100">تحكم في تجربة العميل والروابط والاتصال من دون عرض بيانات حساسة.</p></header>
    <div className="mt-5 space-y-5">
      <section className="rounded-3xl border border-blue-100 bg-white p-5 shadow-sm"><h2 className="flex items-center gap-2 font-bold text-slate-800"><UserRound className="size-5 text-blue-600" />عام</h2><div className="mt-4 grid gap-3 sm:grid-cols-2"><Input value={draft.platform_name} onChange={event => update("platform_name", event.target.value)} placeholder="اسم المنصة" className="h-11 rounded-xl text-right" /><Input value={draft.owner_name} onChange={event => update("owner_name", event.target.value)} placeholder="اسم المالك أو فريق الدعم" className="h-11 rounded-xl text-right" /><Input value={draft.owner_avatar_url} onChange={event => update("owner_avatar_url", event.target.value)} placeholder="رابط صورة المالك (اختياري)" className="h-11 rounded-xl text-right sm:col-span-2" /></div><p className="mt-3 text-xs text-slate-400"><Globe2 className="ml-1 inline size-3" />الواجهة عربية واتجاهها RTL.</p></section>
      <section className="rounded-3xl border border-blue-100 bg-white p-5 shadow-sm"><h2 className="flex items-center gap-2 font-bold text-slate-800"><ShieldCheck className="size-5 text-blue-600" />تجربة العميل</h2><Textarea value={draft.welcome_message} onChange={event => update("welcome_message", event.target.value)} placeholder="رسالة الترحيب" className="mt-4 min-h-24 rounded-xl text-right" /><div className="mt-3 grid gap-3 sm:grid-cols-3">{toggle("guest_require_email", "طلب البريد الإلكتروني")}{toggle("guest_show_phone", "إظهار رقم الهاتف")}{toggle("guest_show_extra_data", "إظهار البيانات الإضافية")}</div></section>
      <section className="rounded-3xl border border-blue-100 bg-white p-5 shadow-sm"><h2 className="flex items-center gap-2 font-bold text-slate-800"><Bell className="size-5 text-blue-600" />الدعوات والتواصل</h2><div className="mt-4 grid gap-3 sm:grid-cols-2"><label className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700"><span className="mb-2 block">نوع رابط الدعوة الافتراضي</span><select value={draft.invite_default_type} onChange={event => update("invite_default_type", event.target.value as "reusable" | "one_time")} className="w-full bg-transparent text-right outline-none"><option value="reusable">قابل لإعادة الاستخدام</option><option value="one_time">لمرة واحدة</option></select></label>{toggle("communication_chat", "المحادثات مفعلة")}{toggle("communication_calls", "المكالمات مفعلة")}{toggle("communication_notifications", "التنبيهات مفعلة")}</div></section>
      <section className="rounded-3xl border border-blue-100 bg-white p-5 shadow-sm"><h2 className="flex items-center gap-2 font-bold text-slate-800"><Mic className="size-5 text-blue-600" />WebRTC وVoice AI</h2><p className="mt-3 rounded-2xl bg-amber-50 p-4 text-sm leading-7 text-amber-800">تظهر حالة STUN وTURN وVoice AI في الصفحات المتخصصة. لا يمكن ولا ينبغي عرض مفاتيح API أو أسرار أو بيانات TURN في هذه الواجهة.</p></section>
      <div className="flex flex-wrap items-center justify-end gap-3"><p aria-live="polite" className={`text-sm font-semibold ${statusColor}`}>{statusText}</p><Button onClick={saveDraft} disabled={isSaving} className="h-11 rounded-xl bg-blue-600 px-6 hover:bg-blue-700">{isSaving && <Loader2 className="ml-2 size-4 animate-spin" />}حفظ إعدادات المالك</Button></div>
    </div>
  </main>;
}
