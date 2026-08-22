import { beforeEach, describe, expect, it, vi } from "vitest";
import * as db from "../db";
import { clientExperienceRouter } from "./clientExperience";

const baseInput = {
  contactId: 42,
  headline: "تحديث مخصص للعميل",
  bodyText: "شرح موجز للحالة.",
  imageUrl: null,
  imagePosition: "top" as const,
  imageScale: 110,
  accentColor: "#128c7e",
  textColor: "#0f172a",
  displaySection: "institution" as const,
  buttonLabel: "عرض التفاصيل",
  buttonEnabled: true,
  buttonSection: "application" as const,
  acceptanceStatus: "accepted" as const,
  acceptanceTitle: "تم القبول المبدئي",
  acceptanceNote: "يرجى متابعة الخطوة التالية.",
  notifyClient: true,
};

describe("تخصيص تجربة العميل", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("يحفظ إعدادات عميل محدد فقط مع حالة القبول والإشعار", async () => {
    vi.spyOn(db, "getContactDetails").mockResolvedValue({ contact: { id: 42 } } as Awaited<ReturnType<typeof db.getContactDetails>>);
    const saved = { ...db.getClientExperienceDefaults(42), ...baseInput, id: 1, version: 3, updatedAt: new Date() };
    const saveSpy = vi.spyOn(db, "saveClientExperience").mockResolvedValue(saved);
    const caller = clientExperienceRouter.createCaller({} as never);

    await expect(caller.ownerSave(baseInput)).resolves.toMatchObject({ contactId: 42, acceptanceStatus: "accepted", displaySection: "institution", notifyClient: true, version: 3 });
    expect(saveSpy).toHaveBeenCalledWith(expect.objectContaining({ contactId: 42, displaySection: "institution", buttonSection: "application", imageUrl: null }));
  });

  it("يرفض اللون غير الآمن قبل حفظ إعداد العميل", async () => {
    const caller = clientExperienceRouter.createCaller({} as never);
    await expect(caller.ownerSave({ ...baseInput, accentColor: "blue" })).rejects.toThrow();
  });

  it("يعيد تجربة العميل عبر جلسة الضيف دون كشف بيانات عميل آخر", async () => {
    const expected = { ...db.getClientExperienceDefaults(42), id: 1, version: 2, acceptanceStatus: "needs_action" as const, updatedAt: new Date() };
    vi.spyOn(db, "getGuestClientExperience").mockResolvedValue(expected);
    const caller = clientExperienceRouter.createCaller({} as never);
    await expect(caller.guestGet({ publicId: "customer-public", accessToken: "a".repeat(24) })).resolves.toMatchObject({ contactId: 42, acceptanceStatus: "needs_action", version: 2 });
  });
});
