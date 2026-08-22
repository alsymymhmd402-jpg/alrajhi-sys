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
