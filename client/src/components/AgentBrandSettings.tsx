import { trpc } from "@/lib/trpc";
import { useEffect } from "react";

const hexColor = /^#[0-9a-fA-F]{6}$/;

export function AgentBrandSettings() {
  const settingsQuery = trpc.operations.settings.useQuery(undefined, { refetchInterval: 5000 });

  useEffect(() => {
    const color = settingsQuery.data?.find(setting => setting.settingKey === "brand.primaryColor")?.settingValue;
    if (color && hexColor.test(color)) {
      document.documentElement.style.setProperty("--agent-brand-primary", color);
      document.documentElement.dataset.agentBrandColor = "enabled";
      return;
    }
    document.documentElement.style.removeProperty("--agent-brand-primary");
    delete document.documentElement.dataset.agentBrandColor;
  }, [settingsQuery.data]);

  return null;
}
