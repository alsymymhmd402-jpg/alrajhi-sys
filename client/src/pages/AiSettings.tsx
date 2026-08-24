import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { Bot, Bug, CheckCircle2, ExternalLink, Loader2, MessageSquareText, Play, Save, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

export default function AiSettings() {
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const settingsQuery = trpc.aiResponder.settings.useQuery();
  const [enabled, setEnabled] = useState(true);
  const [model, setModel] = useState("gpt-5-mini");
  const [instruction, setInstruction] = useState("");
  const [testMessage, setTestMessage] = useState("مرحباً، أحتاج إلى مساعدة بخصوص طلبي.");
  const [testChannel, setTestChannel] = useState<"institution" | "finance" | "follow_up">("institution");
  const [reply, setReply] = useState("");
  useEffect(() => { if (settingsQuery.data) { setEnabled(settingsQuery.data.customer.enabled); setModel(settingsQuery.data.customer.model); setInstruction(settingsQuery.data.customer.instruction); } }, [settingsQuery.data]);
  const saveMutation = trpc.aiResponder.saveCustomerSettings.useMutation({ onSuccess: async () => { await utils.aiResponder.settings.invalidate(); toast.success("تم حفظ إعدادات وكيل الرد."); }, onError: error => toast.error(error.message) });
  const testMutation = trpc.aiResponder.testCustomerReply.useMutation({ onSuccess: result => setReply(result.reply), onError: error => toast.error(error.message) });
  if (settingsQuery.isLoading) return <div className="flex min-h-[50vh] items-center justify-center"><Loader2 className="size-7 animate-spin text-emerald-600" /></div>;
  const settings = settingsQuery.data;
  if (!settings) return null;
  return <div className="mx-auto max-w-5xl space-y-6" dir="rtl">
    <header className="rounded-3xl bg-gradient-to-l from-emerald-800 via-emerald-700 to-teal-600 p-7 text-white shadow-xl"><div className="flex items-start gap-4"><span className="rounded-2xl bg-white/15 p-3"><Bot className="size-7" /></span><div><p className="text-xs font-bold tracking-[.16em] text-emerald-100">AI CONTROL ROOM</p><h1 className="mt-2 text-2xl font-extrabold">إعدادات الذكاء الاصطناعي</h1><p className="mt-2 max-w-2xl text-sm leading-7 text-emerald-50">تحكم في ردود العملاء الآلية واختبرها قبل الاعتماد، وتابع حالة وكيل مراجعة الأخطاء من مكان واحد.</p></div></div></header>
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_330px]"><Card className="border-emerald-100"><CardHeader><div className="flex items-center justify-between gap-3"><div><CardTitle className="flex items-center gap-2 text-lg"><MessageSquareText className="size-5 text-emerald-700" />وكيل الرد على العملاء</CardTitle><CardDescription className="mt-1">يرد تلقائياً في قنوات المؤسسة والإدارة المالية ومتابعة الطلب، ويحيل الحالات الحساسة للفريق.</CardDescription></div><Switch checked={enabled} onCheckedChange={setEnabled} aria-label="تفعيل وكيل الرد على العملاء" /></div></CardHeader><CardContent className="space-y-5"><div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label>حالة الرد الآلي</Label><div className="flex h-10 items-center gap-2 rounded-xl border bg-emerald-50 px-3 text-sm font-bold text-emerald-800"><CheckCircle2 className="size-4" />{enabled ? "مفعّل" : "متوقف"}</div></div><div className="space-y-2"><Label>نموذج الرد</Label><Select value={model} onValueChange={setModel}><SelectTrigger dir="ltr" className="rounded-xl"><SelectValue /></SelectTrigger><SelectContent>{settings.customerModels.map(item => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select></div></div><div className="space-y-2"><Label htmlFor="ai-instruction">توجيهات الوكيل</Label><Textarea id="ai-instruction" value={instruction} onChange={event => setInstruction(event.target.value)} rows={6} className="leading-7" /><p className="text-xs text-muted-foreground">لا تضع مفاتيح أو بيانات عملاء حساسة ضمن التوجيهات.</p></div><Button onClick={() => saveMutation.mutate({ enabled, model: model as "gpt-5-mini" | "gpt-5-nano" | "gemini-3-flash-preview" | "claude-haiku-4-5", instruction })} disabled={saveMutation.isPending} className="rounded-xl bg-emerald-700 hover:bg-emerald-800"><Save className="ml-2 size-4" />{saveMutation.isPending ? "جارٍ الحفظ…" : "حفظ إعدادات الرد"}</Button></CardContent></Card>
      <Card className="border-amber-100"><CardHeader><CardTitle className="flex items-center gap-2 text-base"><Bug className="size-5 text-amber-600" />وكيل مراجعة الأخطاء</CardTitle><CardDescription>يعرض التحليلات واقتراحات الإصلاح في غرفة الوكيل، ولا ينفذ تغييرات دون موافقتك.</CardDescription></CardHeader><CardContent className="space-y-4"><div className="flex items-center justify-between rounded-xl bg-slate-50 p-3"><span className="text-sm font-bold">حالة الاعتماد</span><Badge className={settings.repairAgent.configured ? "bg-emerald-600" : "bg-amber-500"}>{settings.repairAgent.configured ? "جاهز للمراجعة" : "يلزم إعداد Gemini"}</Badge></div><div className="rounded-xl border border-amber-100 bg-amber-50 p-3 text-xs leading-6 text-amber-900"><ShieldCheck className="mb-2 size-4" />كل اقتراح إصلاح يبقى في حالة معاينة حتى تضغط أنت «موافقة وتطبيق».</div><Button variant="outline" className="w-full rounded-xl" onClick={() => setLocation(settings.repairAgent.route)}><ExternalLink className="ml-2 size-4" />فتح وكيل مراجعة الأخطاء</Button></CardContent></Card></div>
    <Card><CardHeader><CardTitle className="flex items-center gap-2"><Play className="size-5 text-blue-600" />اختبار مباشر للرد</CardTitle><CardDescription>هذا الاختبار لا يرسل أي رسالة إلى العميل ولا يضيفها إلى سجل المحادثات.</CardDescription></CardHeader><CardContent className="space-y-4"><div className="grid gap-3 sm:grid-cols-[220px_1fr]"><Select value={testChannel} onValueChange={value => setTestChannel(value as "institution" | "finance" | "follow_up")}><SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="institution">مراسلة المؤسسة</SelectItem><SelectItem value="finance">نظام الإدارة المالية</SelectItem><SelectItem value="follow_up">فريق دعم متابعة الطلب</SelectItem></SelectContent></Select><Input value={testMessage} onChange={event => setTestMessage(event.target.value)} className="h-12 rounded-xl text-right" placeholder="اكتب رسالة اختبار" /></div><Button variant="outline" onClick={() => testMutation.mutate({ content: testMessage, channel: testChannel })} disabled={testMutation.isPending || testMessage.trim().length < 2} className="rounded-xl"><Bot className="ml-2 size-4" />{testMutation.isPending ? "جارٍ توليد الرد…" : "اختبار الرد"}</Button>{reply && <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm leading-7 text-emerald-950"><p className="mb-1 font-bold text-emerald-800">رد الوكيل</p>{reply}</div>}</CardContent></Card>
  </div>;
}
