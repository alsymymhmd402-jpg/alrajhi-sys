import ClientSessionUnavailable from "@/pages/ClientSessionUnavailable";
import { getClientSession } from "@/lib/clientSession";
import { getClientEntryPath } from "@/lib/clientRoutes";
import { Loader2 } from "lucide-react";
import { useEffect, useMemo } from "react";
import { useLocation, useRoute } from "wouter";

const logoUrl = "/manus-storage/alwaleed-philanthropies-mark_d87d264e.jpg";

export default function ClientHome() {
  const [, params] = useRoute("/client/:publicId");
  const [, setLocation] = useLocation();
  const publicId = params?.publicId ?? "";
  const accessToken = useMemo(() => publicId ? getClientSession(publicId) : null, [publicId]);
  useEffect(() => { if (accessToken) setLocation(getClientEntryPath(publicId)); }, [accessToken, publicId, setLocation]);
  if (!accessToken) return <ClientSessionUnavailable />;
  return <div className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-[#e8efe9]" dir="rtl"><img src={logoUrl} alt="" aria-hidden="true" className="pointer-events-none absolute size-72 object-contain opacity-[.07]" /><div className="relative flex flex-col items-center gap-3 text-center"><div className="flex size-16 items-center justify-center rounded-3xl bg-white p-3 shadow-xl shadow-emerald-950/10"><img src={logoUrl} alt="مؤسسة الوليد بن طلال الإنسانية" className="size-full object-contain" /></div><Loader2 className="size-5 animate-spin text-[#128c7e]" /><p className="text-sm font-bold text-[#075e54]">جارٍ فتح مراسلة المؤسسة</p></div></div>;
}
