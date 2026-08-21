export type ClientConversationStatus = "open" | "in_progress" | "closed";
export type ClientRequestStatus = "new" | "in_progress" | "waiting" | "completed" | "closed";

export function getAcceptanceStatus(status: ClientConversationStatus) {
  const values = {
    open: { title: "تم استلام طلبك", description: "وصل طلبك إلى المؤسسة وهو بانتظار بدء المراجعة.", tone: "amber" as const, index: 0 },
    in_progress: { title: "طلبك قيد المراجعة", description: "يتابع فريق خدمة العملاء طلبك حالياً. ستصلك أي تحديثات عبر المحادثة.", tone: "blue" as const, index: 1 },
    closed: { title: "اكتملت متابعة الطلب", description: "أغلق فريق المؤسسة المتابعة الحالية. راجع المحادثة للاطلاع على التفاصيل النهائية.", tone: "emerald" as const, index: 2 },
  };
  return values[status];
}

export function getRequestAcceptanceStatus(status: ClientRequestStatus) {
  const values = {
    new: { title: "تم استلام طلبك", description: "طلبك مسجّل لدى المؤسسة وجاهز لبدء المراجعة.", tone: "amber" as const, index: 0 },
    in_progress: { title: "طلبك قيد المراجعة", description: "يعمل فريق المؤسسة حالياً على متابعة الطلب.", tone: "blue" as const, index: 1 },
    waiting: { title: "طلبك بانتظار متابعة", description: "يحتاج الطلب إلى متابعة إضافية من المؤسسة قبل إكمال المعالجة.", tone: "amber" as const, index: 1 },
    completed: { title: "اكتملت معالجة طلبك", description: "أتمت المؤسسة معالجة الطلب. راجع المحادثة للاطلاع على التفاصيل.", tone: "emerald" as const, index: 2 },
    closed: { title: "أُغلق الطلب", description: "أغلقت المؤسسة الطلب الحالي. راجع المحادثة لمعرفة التفاصيل أو بدء متابعة جديدة عند الحاجة.", tone: "slate" as const, index: 2 },
  };
  return values[status];
}
