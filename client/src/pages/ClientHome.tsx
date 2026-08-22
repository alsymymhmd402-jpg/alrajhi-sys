import ClientSessionUnavailable from "@/pages/ClientSessionUnavailable";
import { getClientSession } from "@/lib/clientSession";
import { addInstitutionResourceHints, hasInstitutionPreload, institutionUrl, markInstitutionPreloaded } from "@/lib/institutionPreload";
import { Loader2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useLocation, useRoute } from "wouter";

export default function ClientHome() {
  const [, params] = useRoute("/client/:publicId");
  const [, setLocation] = useLocation();
  const publicId = params?.publicId ?? "";
  const accessToken = useMemo(() => publicId ? getClientSession(publicId) : null, [publicId]);
  const [isPreloading, setIsPreloading] = useState(false);
  useEffect(() => {
    if (!accessToken) return;
    addInstitutionResourceHints();
    if (hasInstitutionPreload()) { setLocation(`/client/${publicId}/institution`); return; }
    setIsPreloading(true);
    const timeout = window.setTimeout(() => { markInstitutionPreloaded(); setLocation(`/client/${publicId}/institution`); }, 3500);
    return () => window.clearTimeout(timeout);
  }, [accessToken, publicId, setLocation]);
  if (!accessToken) return <ClientSessionUnavailable />;
  return <div className="relative flex min-h-screen flex-col items-center justify-center gap-3 bg-[#e8efe9] text-center" dir="rtl"><iframe title="تهيئة موقع المؤسسة" src={isPreloading ? institutionUrl : undefined} onLoad={() => { markInstitutionPreloaded(); setLocation(`/client/${publicId}/institution`); }} className="pointer-events-none absolute size-px opacity-0" tabIndex={-1} aria-hidden="true" /><Loader2 className="size-7 animate-spin text-[#128c7e]" /><p className="text-sm font-bold text-[#075e54]">جارٍ تجهيز تجربة المؤسسة</p><p className="max-w-xs text-xs leading-6 text-slate-500">يتم تحميل موقع المؤسسة للمرة الأولى لتصبح تصفحه أسرع عند العودة إليه.</p></div>;
}
