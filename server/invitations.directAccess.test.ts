import { describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

vi.mock("./db", () => ({
  createInvitation: vi.fn(),
  getVoiceModel: vi.fn(),
}));

import * as db from "./db";
import { appRouter } from "./routers";

const anonymousContext: TrpcContext = {
  user: null,
  req: { protocol: "https", headers: {} } as TrpcContext["req"],
  res: {} as TrpcContext["res"],
};

describe("روابط الدعوة المباشرة", () => {
  it("ينشئ رابطاً صالحاً للعميل من دون جلسة مالك", async () => {
    vi.mocked(db.createInvitation).mockResolvedValue({ id: 9, code: "invite-code-123", label: "عميل جديد" } as never);
    const caller = appRouter.createCaller(anonymousContext);

    const invitation = await caller.invitations.create({ label: "عميل جديد", type: "reusable" });

    expect(invitation).toMatchObject({ id: 9, code: "invite-code-123" });
    expect(db.createInvitation).toHaveBeenCalledWith(expect.objectContaining({
      label: "عميل جديد",
      type: "reusable",
      code: expect.any(String),
    }));
  });

  it("يحفظ صوتاً مختلفاً لكل رابط دعوة", async () => {
    vi.clearAllMocks();
    vi.mocked(db.getVoiceModel).mockResolvedValue({ id: 11, status: "active", name: "صوت عربي" } as never);
    vi.mocked(db.createInvitation).mockImplementation(async input => ({ id: input.voiceModelId === 11 ? 11 : 22, ...input }) as never);
    const caller = appRouter.createCaller(anonymousContext);

    await caller.invitations.create({ label: "عميل الصوت الأول", type: "reusable", voiceModelId: 11 });
    vi.mocked(db.getVoiceModel).mockResolvedValue({ id: 22, status: "active", name: "صوت ثانٍ" } as never);
    await caller.invitations.create({ label: "عميل الصوت الثاني", type: "reusable", voiceModelId: 22 });

    expect(db.createInvitation).toHaveBeenNthCalledWith(1, expect.objectContaining({ label: "عميل الصوت الأول", voiceModelId: 11 }));
    expect(db.createInvitation).toHaveBeenNthCalledWith(2, expect.objectContaining({ label: "عميل الصوت الثاني", voiceModelId: 22 }));
  });
});
