import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { Check, Clock3, Eye, Film, ImagePlus, Loader2, Palette, Send, Sparkles, Trash2, Type, UploadCloud } from "lucide-react";
import { ChangeEvent, CSSProperties, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

type MediaFilter = "none" | "warm" | "cool" | "mono" | "vivid" | "fade";
type TextFont = "modern" | "classic" | "handwritten" | "bold";
type TextAlign = "right" | "center" | "left";

const filterStyles: Record<MediaFilter, string> = {
  none: "none",
  warm: "sepia(.22) saturate(1.18) contrast(1.04)",
  cool: "hue-rotate(168deg) saturate(.82) contrast(1.05)",
  mono: "grayscale(1) contrast(1.13)",
  vivid: "saturate(1.42) contrast(1.13)",
  fade: "saturate(.72) contrast(.9) brightness(1.08)",
};

const fontFamilies: Record<TextFont, string> = {
  modern: "var(--font-sans, Arial, sans-serif)",
  classic: "Georgia, 'Times New Roman', serif",
  handwritten: "cursive",
  bold: "var(--font-sans, Arial, sans-serif)",
};

const filterLabels: Array<{ value: MediaFilter; label: string }> = [
  { value: "none", label: "طبيعي" },
  { value: "warm", label: "دافئ" },
  { value: "cool", label: "بارد" },
  { value: "mono", label: "أبيض وأسود" },
  { value: "vivid", label: "حيوي" },
  { value: "fade", label: "هادئ" },
];

const toBase64Url = (file: File) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result).split(",")[1]?.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "") ?? "");
  reader.onerror = () => reject(new Error("تعذّرت قراءة الملف."));
  reader.readAsDataURL(file);
});

function previewStyle(input: { filter: MediaFilter; textColor: string; textFont: TextFont; textAlign: TextAlign; x: number; y: number }): CSSProperties {
  return { color: input.textColor, fontFamily: fontFamilies[input.textFont], fontWeight: input.textFont === "bold" ? 800 : 700, textAlign: input.textAlign, left: `${input.x}%`, top: `${input.y}%`, transform: "translate(-50%, -50%)" };
}

export default function InstitutionStatusStudio() {
  const utils = trpc.useUtils();
  const statusesQuery = trpc.institutionStatuses.ownerList.useQuery(undefined, { refetchInterval: 8000 });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [textColor, setTextColor] = useState("#ffffff");
  const [textFont, setTextFont] = useState<TextFont>("modern");
  const [textAlign, setTextAlign] = useState<TextAlign>("center");
  const [textPositionX, setTextPositionX] = useState(50);
  const [textPositionY, setTextPositionY] = useState(76);
  const [mediaFilter, setMediaFilter] = useState<MediaFilter>("none");
  const [editingId, setEditingId] = useState<number | null>(null);

  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);

  const invalidate = () => void utils.institutionStatuses.ownerList.invalidate();
  const createMutation = trpc.institutionStatuses.create.useMutation({ onSuccess: invalidate, onError: error => toast.error(error.message) });
  const beginUploadMutation = trpc.institutionStatuses.beginUpload.useMutation({ onError: error => toast.error(error.message) });
  const uploadChunkMutation = trpc.institutionStatuses.uploadChunk.useMutation({ onError: error => toast.error(error.message) });
  const completeUploadMutation = trpc.institutionStatuses.completeUpload.useMutation({ onError: error => toast.error(error.message) });
  const updateMutation = trpc.institutionStatuses.update.useMutation({ onSuccess: () => { invalidate(); toast.success("تم حفظ تنسيق الحالة."); }, onError: error => toast.error(error.message) });
  const publishMutation = trpc.institutionStatuses.publish.useMutation({ onSuccess: () => { invalidate(); toast.success("نُشرت الحالة للعميل لمدة 24 ساعة."); }, onError: error => toast.error(error.message) });
  const unpublishMutation = trpc.institutionStatuses.unpublish.useMutation({ onSuccess: () => { invalidate(); toast.message("أُخفيت الحالة عن العميل."); }, onError: error => toast.error(error.message) });
  const removeMutation = trpc.institutionStatuses.remove.useMutation({ onSuccess: () => { invalidate(); toast.success("حُذفت الحالة من الاستوديو."); }, onError: error => toast.error(error.message) });
  const isBusy = createMutation.isPending || beginUploadMutation.isPending || uploadChunkMutation.isPending || completeUploadMutation.isPending || updateMutation.isPending || publishMutation.isPending;

  const resetEditor = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setSelectedFile(null); setPreviewUrl(null); setCaption(""); setTextColor("#ffffff"); setTextFont("modern"); setTextAlign("center"); setTextPositionX(50); setTextPositionY(76); setMediaFilter("none"); setEditingId(null);
  };

  const onFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const isImage = file.type.startsWith("image/");
    const isVideo = ["video/mp4", "video/webm", "video/quicktime"].includes(file.type);
    const maxBytes = isVideo ? 14 * 1024 * 1024 : 8 * 1024 * 1024;
    if (!isImage && !isVideo) return toast.error("ارفع صورة أو فيديو MP4 أو WebM أو MOV.");
    if (file.size > maxBytes) return toast.error(isVideo ? "حد الفيديو 14 ميغابايت." : "حد الصورة 8 ميغابايت.");
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setSelectedFile(file); setPreviewUrl(URL.createObjectURL(file)); setEditingId(null);
  };

  const buildStyle = () => ({ textContent: caption.trim() || null, textColor, textFont, textAlign, textPositionX, textPositionY, mediaFilter });

  const saveDraft = async (publishNow: boolean) => {
    if (editingId) {
      await updateMutation.mutateAsync({ id: editingId, ...buildStyle() });
      if (publishNow) await publishMutation.mutateAsync({ id: editingId });
      return;
    }
    if (!selectedFile) return toast.error("اختر صورة أو فيديو أولاً.");
    try {
      const maxBytes = selectedFile.type.startsWith("video/") ? 14 * 1024 * 1024 : 8 * 1024 * 1024;
      if (selectedFile.size > maxBytes) throw new Error(selectedFile.type.startsWith("video/") ? "حجم الفيديو يجب ألا يتجاوز 14 ميغابايت." : "حجم الصورة يجب ألا يتجاوز 8 ميغابايت.");
      const encoded = await toBase64Url(selectedFile);
      const chunkSize = 26_000;
      const totalChunks = Math.ceil(encoded.length / chunkSize);
      const started = await beginUploadMutation.mutateAsync({ fileName: selectedFile.name, mimeType: selectedFile.type, size: selectedFile.size, totalChunks });
      for (let index = 0; index < totalChunks; index += 1) {
        const chunk = encoded.slice(index * chunkSize, (index + 1) * chunkSize);
        await uploadChunkMutation.mutateAsync({ uploadId: started.uploadId, index, data: chunk.split("").reverse().join("") });
      }
      const upload = await completeUploadMutation.mutateAsync({ uploadId: started.uploadId });
      const created = await createMutation.mutateAsync({ fileName: selectedFile.name, mimeType: selectedFile.type, storageKey: upload.key, mediaUrl: upload.url, ...buildStyle() });
      setEditingId(created.id);
      if (publishNow) await publishMutation.mutateAsync({ id: created.id });
      else toast.success("حُفظت الحالة كمسودة.");
    } catch (error) {
      if (error instanceof Error) toast.error(error.message);
    }
  };

  const editStatus = (status: NonNullable<typeof statusesQuery.data>[number]) => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setSelectedFile(null); setPreviewUrl(status.mediaUrl); setCaption(status.textContent ?? ""); setTextColor(status.textColor); setTextFont(status.textFont); setTextAlign(status.textAlign); setTextPositionX(status.textPositionX); setTextPositionY(status.textPositionY); setMediaFilter(status.mediaFilter); setEditingId(status.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const previewIsVideo = useMemo(() => selectedFile ? selectedFile.type.startsWith("video/") : statusesQuery.data?.find(status => status.id === editingId)?.mediaType === "video", [editingId, selectedFile, statusesQuery.data]);
  const preview = previewUrl;

  return <div className="mx-auto max-w-[1440px] space-y-6" dir="rtl">
    <header className="flex flex-col gap-4 rounded-[2rem] bg-gradient-to-l from-blue-800 via-blue-600 to-indigo-500 px-6 py-7 text-white shadow-xl shadow-blue-100 lg:flex-row lg:items-center lg:justify-between">
      <div><p className="text-xs font-bold tracking-[.18em] text-blue-100">INSTITUTION STORIES</p><h1 className="mt-2 text-2xl font-extrabold">حالات المؤسسة</h1><p className="mt-2 max-w-xl text-sm leading-6 text-blue-50">انشر صورة أو فيديو بصورة تشبه حالة واتساب؛ أضف نصاً وفلتراً ثم اختر النشر الآن أو الحفظ كمسودة.</p></div>
      <div className="flex items-center gap-3 rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-sm"><Clock3 className="size-5 text-blue-100" /><span>تظهر الحالات المنشورة للعميل لمدة <b>24 ساعة</b></span></div>
    </header>

    <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_390px]">
      <div className="space-y-5 rounded-[2rem] border border-blue-100 bg-white p-5 shadow-[0_18px_60px_-30px_rgba(30,64,175,.28)] sm:p-6">
        <div className="flex items-center justify-between gap-3"><div><h2 className="text-lg font-extrabold text-slate-900">{editingId ? "تعديل الحالة" : "إنشاء حالة جديدة"}</h2><p className="mt-1 text-sm text-slate-500">الصورة حتى 8 ميغابايت، والفيديو حتى 14 ميغابايت.</p></div>{editingId && <Button variant="outline" onClick={resetEditor} className="rounded-xl">حالة جديدة</Button>}</div>
        <div className="grid gap-5 md:grid-cols-2">
          <div className="space-y-2"><Label htmlFor="status-media">الصورة أو الفيديو</Label><label htmlFor="status-media" className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-blue-200 bg-blue-50/60 px-4 py-6 text-sm font-bold text-blue-700 transition hover:border-blue-400 hover:bg-blue-50"><UploadCloud className="size-5" />{selectedFile ? selectedFile.name : editingId ? "للاستبدال: أنشئ حالة جديدة بوسيط آخر" : "اختر من جهازك"}</label><Input id="status-media" type="file" accept="image/*,video/mp4,video/webm,video/quicktime" onChange={onFileChange} className="sr-only" disabled={Boolean(editingId)} /></div>
          <div className="space-y-2"><Label htmlFor="status-caption">النص فوق الحالة</Label><Textarea id="status-caption" value={caption} onChange={event => setCaption(event.target.value)} placeholder="اكتب رسالة الحالة…" className="min-h-[104px] resize-none rounded-2xl border-slate-200 text-right" maxLength={500} /><p className="text-left text-xs text-slate-400">{caption.length}/500</p></div>
        </div>

        <div className="grid gap-5 border-t border-slate-100 pt-5 md:grid-cols-2">
          <div className="space-y-3"><div className="flex items-center gap-2 text-sm font-bold text-slate-800"><Palette className="size-4 text-blue-600" />فلتر الوسيط</div><div className="grid grid-cols-3 gap-2">{filterLabels.map(filter => <button key={filter.value} type="button" onClick={() => setMediaFilter(filter.value)} className={`rounded-xl border px-3 py-2 text-xs font-bold transition ${mediaFilter === filter.value ? "border-blue-600 bg-blue-600 text-white" : "border-slate-200 text-slate-600 hover:border-blue-300"}`}>{filter.label}</button>)}</div></div>
          <div className="space-y-3"><div className="flex items-center gap-2 text-sm font-bold text-slate-800"><Type className="size-4 text-blue-600" />النص والخط</div><div className="grid grid-cols-[48px_1fr] gap-2"><Input aria-label="لون النص" type="color" value={textColor} onChange={event => setTextColor(event.target.value)} className="h-10 w-12 rounded-xl p-1" /><select value={textFont} onChange={event => setTextFont(event.target.value as TextFont)} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm"><option value="modern">عصري</option><option value="classic">كلاسيكي</option><option value="handwritten">يدوي</option><option value="bold">عريض</option></select></div><div className="grid grid-cols-3 gap-2">{(["right", "center", "left"] as TextAlign[]).map(value => <button key={value} type="button" onClick={() => setTextAlign(value)} className={`rounded-xl border py-2 text-xs font-bold ${textAlign === value ? "border-blue-600 bg-blue-50 text-blue-700" : "border-slate-200 text-slate-500"}`}>{value === "right" ? "يمين" : value === "center" ? "وسط" : "يسار"}</button>)}</div></div>
        </div>

        <div className="grid gap-5 border-t border-slate-100 pt-5 md:grid-cols-2"><div><div className="mb-3 flex justify-between text-sm font-bold text-slate-700"><span>موضع النص أفقياً</span><span>{textPositionX}%</span></div><Slider value={[textPositionX]} min={5} max={95} step={1} onValueChange={value => setTextPositionX(value[0] ?? 50)} /></div><div><div className="mb-3 flex justify-between text-sm font-bold text-slate-700"><span>موضع النص عمودياً</span><span>{textPositionY}%</span></div><Slider value={[textPositionY]} min={8} max={92} step={1} onValueChange={value => setTextPositionY(value[0] ?? 76)} /></div></div>
        <div className="flex flex-wrap gap-3 border-t border-slate-100 pt-5"><Button onClick={() => void saveDraft(false)} disabled={isBusy} variant="outline" className="rounded-xl border-blue-200"><Check className="ml-2 size-4" />{isBusy ? "جارٍ الحفظ…" : "حفظ كمسودة"}</Button><Button onClick={() => void saveDraft(true)} disabled={isBusy} className="rounded-xl bg-blue-600 hover:bg-blue-700"><Send className="ml-2 size-4" />{isBusy ? "جارٍ النشر…" : "نشر للعميل الآن"}</Button></div>
      </div>

      <aside className="rounded-[2rem] bg-slate-950 p-4 shadow-xl"><div className="mb-3 flex items-center justify-between px-2 text-white"><span className="font-bold">معاينة العميل</span><span className="text-xs text-slate-400">شاشة الحالة</span></div><div className="relative aspect-[9/16] overflow-hidden rounded-[1.5rem] bg-gradient-to-br from-[#075e54] via-[#128c7e] to-slate-900"><div className="absolute inset-x-0 top-0 z-20 flex items-center gap-2 bg-gradient-to-b from-black/60 to-transparent px-4 py-4 text-white"><div className="size-8 rounded-full bg-white/20" /><div><p className="text-xs font-bold">مؤسسة الوليد الإنسانية</p><p className="text-[10px] text-white/70">حالة جديدة</p></div></div>{preview ? previewIsVideo ? <video key={preview} src={preview} className="absolute inset-0 h-full w-full object-cover" style={{ filter: filterStyles[mediaFilter] }} controls muted playsInline /> : <img src={preview} alt="معاينة الحالة" className="absolute inset-0 h-full w-full object-cover" style={{ filter: filterStyles[mediaFilter] }} /> : <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-10 text-center text-white/80"><ImagePlus className="size-11" /><p className="text-sm leading-6">اختر صورة أو فيديو لتظهر معاينة الحالة هنا.</p></div>}{caption && <p className="absolute z-10 max-w-[82%] break-words px-2 text-lg leading-8 drop-shadow-[0_2px_4px_rgba(0,0,0,.75)]" style={previewStyle({ filter: mediaFilter, textColor, textFont, textAlign, x: textPositionX, y: textPositionY })}>{caption}</p>}<div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/55 to-transparent" /></div></aside>
    </section>

    <section className="rounded-[2rem] border border-blue-100 bg-white p-5 shadow-sm sm:p-6"><div className="flex items-center justify-between"><div><h2 className="text-lg font-extrabold text-slate-900">مكتبة الحالات</h2><p className="mt-1 text-sm text-slate-500">يمكنك تعديل النص والفلاتر أو إخفاء الحالة أو حذفها في أي وقت.</p></div><span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">{statusesQuery.data?.length ?? 0} حالات</span></div>{statusesQuery.isLoading ? <div className="flex h-40 items-center justify-center"><Loader2 className="size-6 animate-spin text-blue-600" /></div> : statusesQuery.data?.length ? <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{statusesQuery.data.map(status => <article key={status.id} className="overflow-hidden rounded-2xl border border-slate-100 bg-slate-50"><div className="relative aspect-video overflow-hidden bg-slate-900">{status.mediaType === "video" ? <video src={status.mediaUrl} className="h-full w-full object-cover" style={{ filter: filterStyles[status.mediaFilter] }} muted /> : <img src={status.mediaUrl} alt="حالة المؤسسة" className="h-full w-full object-cover" style={{ filter: filterStyles[status.mediaFilter] }} />}{status.textContent && <p className="absolute max-w-[84%] break-words px-2 text-sm drop-shadow-[0_2px_3px_rgba(0,0,0,.8)]" style={previewStyle({ filter: status.mediaFilter, textColor: status.textColor, textFont: status.textFont, textAlign: status.textAlign, x: status.textPositionX, y: status.textPositionY })}>{status.textContent}</p>}<span className={`absolute left-3 top-3 rounded-full px-2.5 py-1 text-[11px] font-bold ${status.isPublished && status.expiresAt && new Date(status.expiresAt) > new Date() ? "bg-emerald-500 text-white" : "bg-slate-900/75 text-white"}`}>{status.isPublished && status.expiresAt && new Date(status.expiresAt) > new Date() ? "منشورة" : "مسودة / منتهية"}</span></div><div className="p-4"><div className="flex items-center justify-between text-xs text-slate-500"><span className="flex items-center gap-1"><Eye className="size-3.5" />{status.viewCount} مشاهدة</span><span>{status.mediaType === "video" ? <Film className="size-4" /> : <ImagePlus className="size-4" />}</span></div><div className="mt-4 flex flex-wrap gap-2"><Button size="sm" variant="outline" onClick={() => editStatus(status)} className="rounded-lg">تعديل</Button>{status.isPublished && status.expiresAt && new Date(status.expiresAt) > new Date() ? <Button size="sm" variant="outline" onClick={() => unpublishMutation.mutate({ id: status.id })} className="rounded-lg">إخفاء</Button> : <Button size="sm" onClick={() => publishMutation.mutate({ id: status.id })} className="rounded-lg bg-blue-600 hover:bg-blue-700">نشر</Button>}<Button size="sm" variant="ghost" onClick={() => { if (confirm("حذف هذه الحالة نهائياً من المكتبة؟")) removeMutation.mutate({ id: status.id }); }} className="mr-auto rounded-lg text-rose-600 hover:bg-rose-50 hover:text-rose-700"><Trash2 className="size-4" /></Button></div></div></article>)}</div> : <div className="mt-5 flex min-h-44 flex-col items-center justify-center rounded-2xl border border-dashed border-blue-200 bg-blue-50/50 px-5 text-center"><Sparkles className="mb-3 size-7 text-blue-500" /><h3 className="font-bold text-slate-800">لم تُنشئ حالة بعد</h3><p className="mt-1 text-sm text-slate-500">ارفع أول صورة أو فيديو من الاستوديو أعلاه.</p></div>}</section>
  </div>;
}
