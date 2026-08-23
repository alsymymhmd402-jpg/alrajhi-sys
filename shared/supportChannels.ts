export const supportChannelValues = ["institution", "finance", "follow_up"] as const;
export type SupportChannel = (typeof supportChannelValues)[number];

export const supportChannelMeta: Record<SupportChannel, { label: string; subtitle: string }> = {
  institution: { label: "مراسلة المؤسسة", subtitle: "فريق خدمة العملاء متاح لمساعدتك" },
  finance: { label: "نظام الإدارة المالية", subtitle: "استفسارات الدعم المالي والعمليات ذات الصلة" },
  follow_up: { label: "فريق دعم متابعة طلبك", subtitle: "استفسر عن مراحل طلبك وتحديثاته" },
};
