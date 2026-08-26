export type ClientSection = "support" | "institution" | "profile" | "application";

export function getClientSectionPath(publicId: string, section: ClientSection) {
  const suffix: Record<ClientSection, string> = {
    support: "messages",
    institution: "institution",
    profile: "profile",
    application: "application",
  };
  return `/client/${publicId}/${suffix[section]}`;
}

export function getClientChatPath(
  publicId: string,
  channel?: "finance" | "acceptance" | "private_office"
) {
  const base = `/client/${publicId}/chat`;
  return channel ? `${base}?mode=${channel}` : base;
}
