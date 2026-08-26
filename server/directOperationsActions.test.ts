import { describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

vi.mock("./db", () => ({
  setSafeSetting: vi.fn(),
  updateSupportConversation: vi.fn(),
  updateServiceRequest: vi.fn(),
}));

import * as db from "./db";
import { appRouter } from "./routers";

const anonymousContext: TrpcContext = {
  user: null,
  req: { protocol: "https", headers: {} } as TrpcContext["req"],
  res: {} as TrpcContext["res"],
};

describe("إجراءات غرفة العمليات المباشرة", () => {
  it("يحفظ إعدادات تجربة العميل دون جلسة مالك", async () => {
    vi.mocked(db.setSafeSetting).mockResolvedValue(undefined as never);
    const caller = appRouter.createCaller(anonymousContext);

    await expect(caller.operations.setSetting({ key: "welcome_message", value: "أهلاً بك" })).resolves.toEqual({ success: true });
    expect(db.setSafeSetting).toHaveBeenCalledWith("welcome_message", "أهلاً بك", null);
  });

  it("يؤرشف محادثة من غرفة العمليات دون جلسة مالك", async () => {
    vi.mocked(db.updateSupportConversation).mockResolvedValue({ id: 7, archived: true } as never);
    const caller = appRouter.createCaller(anonymousContext);

    await expect(caller.support.update({ conversationId: 7, archived: true })).resolves.toMatchObject({ id: 7, archived: true });
    expect(db.updateSupportConversation).toHaveBeenCalledWith(7, { archived: true });
  });

  it("يحفظ إيقاف الرد الآلي للعميل الحالي فقط", async () => {
    vi.mocked(db.updateSupportConversation).mockResolvedValue({ id: 7, aiAutoReplyEnabled: false } as never);
    const caller = appRouter.createCaller(anonymousContext);

    await expect(caller.support.update({ conversationId: 7, aiAutoReplyEnabled: false })).resolves.toMatchObject({ id: 7, aiAutoReplyEnabled: false });
    expect(db.updateSupportConversation).toHaveBeenCalledWith(7, { aiAutoReplyEnabled: false });
  });

  it("يحدّث حالة طلب من غرفة العمليات دون جلسة مالك", async () => {
    vi.mocked(db.updateServiceRequest).mockResolvedValue({ id: 3, status: "completed" } as never);
    const caller = appRouter.createCaller(anonymousContext);

    await expect(caller.requests.update({ id: 3, status: "completed" })).resolves.toMatchObject({ id: 3, status: "completed" });
    expect(db.updateServiceRequest).toHaveBeenCalledWith(3, { status: "completed" });
  });
});
