import { getClientSectionPath, type ClientSection } from "@/lib/clientRoutes";
import { getClientSession } from "@/lib/clientSession";
import { trpc } from "@/lib/trpc";
import { ClientExperienceCard } from "@/components/ClientExperienceCard";
import { Building2, ClipboardCheck, MessagesSquare, UserRound } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";

const profileIconUrl = "/manus-storage/c75_600bc253.png";

const items: Array<{ id: ClientSection; label: string; icon: typeof MessagesSquare; image?: string }> = [
  { id: "support", label: "خدمة العملاء", icon: MessagesSquare },
  { id: "institution", label: "المؤسسة", icon: Building2 },
  { id: "profile", label: "ملفي", icon: UserRound, image: profileIconUrl },
  { id: "application", label: "القبول", icon: ClipboardCheck },
];

export function ClientBottomNav({ publicId, active }: { publicId: string; active: ClientSection }) {
  const [, setLocation] = useLocation();
  const accessToken = useMemo(() => getClientSession(publicId), [publicId]);
  const experience = trpc.clientExperience.guestGet.useQuery({ publicId, accessToken: accessToken ?? "" }, { enabled: Boolean(accessToken), refetchInterval: 5000 });
  const storageKey = `client-experience-seen:${publicId}`;
  const [seenVersion, setSeenVersion] = useState(() => Number(sessionStorage.getItem(storageKey) || 0));
  useEffect(() => { if (active === "application" && (experience.data?.version ?? 0) > seenVersion) { const next = experience.data?.version ?? 0; sessionStorage.setItem(storageKey, String(next)); setSeenVersion(next); } }, [active, experience.data?.version, seenVersion, storageKey]);
  const hasUpdate = Boolean(experience.data?.notifyClient && (experience.data?.version ?? 0) > seenVersion);
  return <><div className="fixed bottom-[calc(max(.75rem,env(safe-area-inset-bottom))+5.4rem)] left-1/2 z-40 w-[calc(100%-2rem)] max-w-[25.5rem] -translate-x-1/2"><ClientExperienceCard experience={experience.data} section={active} onNavigate={section => setLocation(getClientSectionPath(publicId, section))} /></div><nav className="fixed bottom-[max(.75rem,env(safe-area-inset-bottom))] left-1/2 z-50 grid w-[calc(100%-1.5rem)] max-w-[26.5rem] -translate-x-1/2 grid-cols-4 rounded-[1.45rem] border border-white/90 bg-white/95 p-1.5 shadow-[0_18px_45px_rgba(4,83,73,.25)] backdrop-blur-xl" aria-label="تنقل تطبيق مراسلة المؤسسة">
    {items.map(item => {
      const Icon = item.icon;
      const selected = item.id === active;
      return <button key={item.id} type="button" onClick={() => setLocation(getClientSectionPath(publicId, item.id))} aria-current={selected ? "page" : undefined} className={`flex min-h-13 flex-col items-center justify-center gap-1 rounded-[1rem] px-1 text-[10px] font-bold transition duration-200 active:scale-95 ${selected ? "bg-[#075e54] text-white shadow-md shadow-emerald-950/15" : "text-slate-400 hover:bg-emerald-50 hover:text-[#075e54]"}`}>
        <span className="relative flex size-6 items-center justify-center">{item.image ? <img src={item.image} alt="" aria-hidden="true" className={`size-5 object-contain ${selected ? "brightness-0 invert" : "opacity-70"}`} /> : <Icon className={`size-5 ${selected ? "stroke-[2.5]" : ""}`} />}{item.id === "application" && hasUpdate && <span className="absolute -right-1 -top-1 size-2.5 rounded-full border-2 border-white bg-rose-500" aria-label="تحديث جديد" />}</span>
        <span className="text-center leading-3">{item.label}</span>
      </button>;
    })}
  </nav></>;
}
