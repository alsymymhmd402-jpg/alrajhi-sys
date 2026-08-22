import { ClientExperienceCard } from "@/components/ClientExperienceCard";
import { getClientSession } from "@/lib/clientSession";
import { getClientSectionPath, type ClientSection } from "@/lib/clientRoutes";
import { trpc } from "@/lib/trpc";
import { useMemo } from "react";
import { useLocation } from "wouter";

export function ClientExperienceSlot({ publicId, section }: { publicId: string; section: ClientSection }) {
  const [, setLocation] = useLocation();
  const accessToken = useMemo(() => getClientSession(publicId), [publicId]);
  const experience = trpc.clientExperience.guestGet.useQuery({ publicId, accessToken: accessToken ?? "" }, { enabled: Boolean(accessToken), refetchInterval: 5000 });
  return <ClientExperienceCard experience={experience.data} section={section} onNavigate={nextSection => setLocation(getClientSectionPath(publicId, nextSection))} />;
}
