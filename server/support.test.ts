import { describe, expect, it } from "vitest";
import { canReplyToConversation, supportMessageSchema, supportStatusLabels, supportStatusSchema } from "./routers/support";
import { canStartDirectCall } from "./routers/calls";
import { canUseInvitation } from "./routers/invitations";

describe("قواعد محادثات الدعم", () => {
  it("تقبل حالات المحادثات الثلاث المحددة فقط", () => {
    expect(supportStatusSchema.parse("open")).toBe("open");
    expect(supportStatusSchema.parse("in_progress")).toBe("in_progress");
    expect(supportStatusSchema.parse("closed")).toBe("closed");
    expect(() => supportStatusSchema.parse("pending")).toThrow();
  });

  it("تمنع إرسال الردود بعد إغلاق المحادثة", () => {
    expect(canReplyToConversation("open")).toBe(true);
    expect(canReplyToConversation("in_progress")).toBe(true);
    expect(canReplyToConversation("closed")).toBe(false);
  });

  it("تنظف نص الرسالة وترفض الرسائل الفارغة أو الطويلة", () => {
    expect(supportMessageSchema.parse("  مرحباً، أحتاج إلى مساعدة.  ")).toBe("مرحباً، أحتاج إلى مساعدة.");
    expect(() => supportMessageSchema.parse("    ")).toThrow("لا يمكن إرسال رسالة فارغة");
    expect(() => supportMessageSchema.parse("أ".repeat(4001))).toThrow("الرسالة طويلة جداً");
  });

  it("يعرض مسميات عربية واضحة للحالات", () => {
    expect(supportStatusLabels).toEqual({ open: "مفتوحة", in_progress: "قيد المعالجة", closed: "مغلقة" });
  });

  it("يمنع بدء مكالمة مباشرة للمحادثات المغلقة", () => {
    expect(canStartDirectCall("open")).toBe(true);
    expect(canStartDirectCall("in_progress")).toBe(true);
    expect(canStartDirectCall("closed")).toBe(false);
  });

  it("يقبل روابط الدعوة النشطة غير المنتهية فقط", () => {
    const now = new Date("2026-08-20T00:00:00.000Z").getTime();
    expect(canUseInvitation("active", null, now)).toBe(true);
    expect(canUseInvitation("active", new Date(now + 1), now)).toBe(true);
    expect(canUseInvitation("active", new Date(now), now)).toBe(false);
    expect(canUseInvitation("used", null, now)).toBe(false);
    expect(canUseInvitation("revoked", null, now)).toBe(false);
    expect(canUseInvitation("expired", null, now)).toBe(false);
  });
});
