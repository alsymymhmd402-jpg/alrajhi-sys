import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

const guestContext: TrpcContext = {
  user: { id: 99, openId: "guest-user", name: "Guest", email: null, loginMethod: "manus", role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
  req: { protocol: "https", headers: {} } as TrpcContext["req"],
  res: {} as TrpcContext["res"],
};

describe("فصل المالك والضيف", () => {
  it("يفتح ملخص غرفة العمليات مباشرة من دون جلسة مالك", async () => {
    const caller = appRouter.createCaller({ ...guestContext, user: null });
    await expect(caller.operations.summary()).resolves.toEqual(expect.objectContaining({ customers: expect.any(Number) }));
  });

  it("يرفض إنشاء جلسة ضيف بلا رابط دعوة", async () => {
    const caller = appRouter.createCaller({ ...guestContext, user: null });
    await expect(caller.support.create({ guestName: "عميل", issue: "طلب دعم" } as never)).rejects.toBeDefined();
  });
});
