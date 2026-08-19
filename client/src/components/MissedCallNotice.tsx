import { Button } from "@/components/ui/button";
import { PhoneOff } from "lucide-react";

export function MissedCallNotice({ recipient, onClose, placement = "center" }: { recipient: "guest" | "owner"; onClose: () => void; placement?: "center" | "owner" }) {
  const isOwner = recipient === "owner";
  return <aside className={`${placement === "owner" ? "fixed bottom-5 left-5 w-[min(360px,calc(100vw-2.5rem))]" : "fixed inset-x-4 bottom-5 mx-auto max-w-sm"} z-50 rounded-3xl border border-amber-200 bg-amber-50 p-5 shadow-2xl shadow-amber-300/20`} dir="rtl"><div className="flex items-center gap-3"><span className="flex size-11 items-center justify-center rounded-2xl bg-amber-100 text-amber-700"><PhoneOff className="size-5" /></span><div><p className="font-bold text-amber-950">مكالمة فائتة</p><p className="mt-1 text-sm text-amber-800">{isOwner ? "لم تتم الإجابة على مكالمة العميل خلال المهلة المحددة." : "لم تتم الإجابة على مكالمة فريق الدعم خلال المهلة المحددة."}</p></div></div><Button variant="outline" onClick={onClose} className="mt-5 w-full rounded-xl border-amber-300 bg-white text-amber-800">إغلاق</Button></aside>;
}
