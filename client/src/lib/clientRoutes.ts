export type ClientSection = "support" | "institution" | "profile" | "application";

export function getClientEntryPath(publicId: string) {
  return getClientSectionPath(publicId, "institution");
}

export function getClientSectionPath(publicId: string, section: ClientSection) {
  const suffix: Record<ClientSection, string> = {
    support: "chat",
    institution: "institution",
    profile: "profile",
    application: "application",
  };
  return `/client/${publicId}/${suffix[section]}`;
}
