import { getClientSectionPath, type ClientSection } from "@/lib/clientRoutes";
import { Building2, ClipboardCheck, MessagesSquare, UserRound } from "lucide-react";
import { useLocation } from "wouter";

const items: Array<{ id: ClientSection; label: string; icon: typeof MessagesSquare }> = [
  { id: "support", label: "خدمة العملاء", icon: MessagesSquare },
  { id: "institution", label: "المؤسسة", icon: Building2 },
  { id: "profile", label: "ملفي", icon: UserRound },
  { id: "application", label: "القبول", icon: ClipboardCheck },
];

export function ClientBottomNav({ publicId, active }: { publicId: string; active: ClientSection }) {
  const [, setLocation] = useLocation();
  return <nav className="grid shrink-0 grid-cols-4 border-t border-slate-100 bg-white pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2" aria-label="تنقل تطبيق مراسلة المؤسسة">
    {items.map(item => {
      const Icon = item.icon;
      const selected = item.id === active;
      return <button key={item.id} type="button" onClick={() => setLocation(getClientSectionPath(publicId, item.id))} aria-current={selected ? "page" : undefined} className={`flex min-h-14 flex-col items-center justify-center gap-1 px-1 text-[10px] font-bold transition ${selected ? "text-[#128c7e]" : "text-slate-400 hover:text-slate-700"}`}><Icon className={`size-5 ${selected ? "stroke-[2.5]" : ""}`} /><span className="text-center leading-3">{item.label}</span></button>;
    })}
  </nav>;
}
