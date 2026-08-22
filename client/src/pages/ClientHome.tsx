import ClientSessionUnavailable from "@/pages/ClientSessionUnavailable";
import { getClientSession } from "@/lib/clientSession";
import { Loader2 } from "lucide-react";
import { useEffect, useMemo } from "react";
import { useLocation, useRoute } from "wouter";

export default function ClientHome() {
  const [, params] = useRoute("/client/:publicId");
  const [, setLocation] = useLocation();
  const publicId = params?.publicId ?? "";
  const accessToken = useMemo(() => publicId ? getClientSession(publicId) : null, [publicId]);
  useEffect(() => { if (accessToken) setLocation(`/client/${publicId}/chat`); }, [accessToken, publicId, setLocation]);
  if (!accessToken) return <ClientSessionUnavailable />;
  return <div className="flex min-h-screen items-center justify-center bg-[#e8efe9]"><Loader2 className="size-7 animate-spin text-[#128c7e]" /></div>;
}
