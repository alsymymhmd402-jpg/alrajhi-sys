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
  const height = `${Math.round(120 * experience.imageScale / 100)}px`;
  return <section className="overflow-hidden rounded-3xl bg-white shadow-sm" style={{ color: experience.textColor }}>
    {experience.imageUrl && experience.imagePosition === "top" && <img src={experience.imageUrl} alt="" className="w-full object-cover" style={{ height }} />}
    <div className="p-5"><p className="text-lg font-extrabold">{experience.headline}</p>{experience.imageUrl && experience.imagePosition === "inline" && <img src={experience.imageUrl} alt="" className="my-3 w-full rounded-2xl object-cover" style={{ height }} />}<p className="mt-2 text-sm leading-7 opacity-75">{experience.bodyText}</p>{experience.buttonEnabled && <button type="button" onClick={() => onNavigate(experience.buttonSection)} className="mt-4 w-full rounded-xl px-3 py-3 text-sm font-extrabold text-white" style={{ backgroundColor: experience.accentColor }}>{experience.buttonLabel}</button>}</div>
    {experience.imageUrl && experience.imagePosition === "bottom" && <img src={experience.imageUrl} alt="" className="w-full object-cover" style={{ height }} />}
  </section>;
}
