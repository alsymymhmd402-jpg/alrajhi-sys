import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

const guestContext: TrpcContext = {
  user: { id: 99, openId: "guest-user", name: "Guest", email: null, loginMethod: "manus", role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
  req: { protocol: "https", headers: {} } as TrpcContext["req"],
  res: {} as TrpcContext["res"],
};

describe("فصل المالك والضيف", () => {
  it("يمنع المستخدم غير الإداري من الوصول إلى غرفة العمليات", async () => {
    const caller = appRouter.createCaller(guestContext);
    await expect(caller.operations.summary()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("يرفض إنشاء جلسة ضيف بلا رابط دعوة", async () => {
    const caller = appRouter.createCaller({ ...guestContext, user: null });
    await expect(caller.support.create({ guestName: "عميل", issue: "طلب دعم" } as never)).rejects.toBeDefined();
  });
});
