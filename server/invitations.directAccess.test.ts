import { describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

vi.mock("./db", () => ({
  createInvitation: vi.fn(),
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
});
