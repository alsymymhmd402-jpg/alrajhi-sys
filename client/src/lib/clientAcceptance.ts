export type ClientConversationStatus = "open" | "in_progress" | "closed";

export function getAcceptanceStatus(status: ClientConversationStatus) {
  const values = {
    open: { title: "تم استلام طلبك", description: "وصل طلبك إلى المؤسسة وهو بانتظار بدء المراجعة.", tone: "amber" as const, index: 0 },
    in_progress: { title: "طلبك قيد المراجعة", description: "يتابع فريق خدمة العملاء طلبك حالياً. ستصلك أي تحديثات عبر المحادثة.", tone: "blue" as const, index: 1 },
    closed: { title: "اكتملت متابعة الطلب", description: "أغلق فريق المؤسسة المتابعة الحالية. راجع المحادثة للاطلاع على التفاصيل النهائية.", tone: "emerald" as const, index: 2 },
  };
  return values[status];
}
