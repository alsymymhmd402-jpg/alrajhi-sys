import ClientSessionUnavailable from "@/pages/ClientSessionUnavailable";
import { getClientSession } from "@/lib/clientSession";
import { primeInstitutionSite } from "@/lib/institutionPreload";
import { useEffect, useMemo } from "react";
import { useLocation, useRoute } from "wouter";

export default function ClientHome() {
  const [, params] = useRoute("/client/:publicId");
  const [, setLocation] = useLocation();
  const publicId = params?.publicId ?? "";
  const accessToken = useMemo(() => publicId ? getClientSession(publicId) : null, [publicId]);
  useEffect(() => {
    if (!accessToken) return;
    primeInstitutionSite();
    setLocation(`/client/${publicId}/chat`);
  }, [accessToken, publicId, setLocation]);
  if (!accessToken) return <ClientSessionUnavailable />;
  return null;
}
