import { trpc } from "@/lib/trpc";
import { useEffect } from "react";

const hexColor = /^#[0-9a-fA-F]{6}$/;
const buttonRadius = /^(?:[4-9]|[1-4][0-9]|50)px$/;

export function AgentBrandSettings() {
  const settingsQuery = trpc.operations.settings.useQuery(undefined, { refetchInterval: 5000 });

  useEffect(() => {
    const color = settingsQuery.data?.find(setting => setting.settingKey === "brand.primaryColor")?.settingValue;
    if (color && hexColor.test(color)) {
      document.documentElement.style.setProperty("--agent-brand-primary", color);
      document.documentElement.dataset.agentBrandColor = "enabled";
    } else {
      document.documentElement.style.removeProperty("--agent-brand-primary");
      delete document.documentElement.dataset.agentBrandColor;
    }
    const radius = settingsQuery.data?.find(setting => setting.settingKey === "brand.buttonRadius")?.settingValue;
    if (radius && buttonRadius.test(radius)) document.documentElement.style.setProperty("--radius", radius);
    else document.documentElement.style.removeProperty("--radius");
  }, [settingsQuery.data]);

  return null;
}
