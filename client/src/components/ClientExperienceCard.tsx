import type { ClientSection } from "@/lib/clientRoutes";

type Experience = {
  version: number;
  displaySection: ClientSection;
  headline: string;
  bodyText: string | null;
  imageUrl: string | null;
  imagePosition: "top" | "inline" | "bottom";
  imageScale: number;
  accentColor: string;
  textColor: string;
  buttonLabel: string;
  buttonEnabled: boolean;
  buttonSection: ClientSection;
};

export function ClientExperienceCard({ experience, section, onNavigate }: { experience?: Experience; section: ClientSection; onNavigate: (section: ClientSection) => void }) {
  if (!experience || experience.version < 1 || experience.displaySection !== section) return null;
  const imageHeight = `${Math.max(112, Math.min(220, Math.round(132 * experience.imageScale / 100)))}px`;
  const image = experience.imageUrl ? <div className="overflow-hidden bg-slate-50 p-1"><img src={experience.imageUrl} alt="الصورة المضافة من خدمة العملاء" className="h-full w-full rounded-2xl object-contain" style={{ height: imageHeight }} /></div> : null;
  return <section className="isolate overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-[0_10px_28px_rgba(15,23,42,.08)]" style={{ color: experience.textColor }}>
    {experience.imagePosition === "top" && image}
    <div className="space-y-3 p-5"><p className="break-words text-lg font-extrabold leading-7">{experience.headline}</p>{experience.imagePosition === "inline" && image}<p className="whitespace-pre-wrap break-words text-sm leading-7 opacity-80">{experience.bodyText}</p>{experience.buttonEnabled && <button type="button" onClick={() => onNavigate(experience.buttonSection)} className="mt-1 w-full rounded-xl px-3 py-3 text-sm font-extrabold text-white shadow-sm transition active:scale-[.98]" style={{ backgroundColor: experience.accentColor }}>{experience.buttonLabel}</button>}</div>
    {experience.imagePosition === "bottom" && image}
  </section>;
}
