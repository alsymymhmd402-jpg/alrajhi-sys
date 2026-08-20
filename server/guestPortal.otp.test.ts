import { describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

vi.mock("./db", () => ({
  validateInvitation: vi.fn(),
  getLatestGuestPhoneChallenge: vi.fn(),
  createGuestPhoneChallenge: vi.fn(),
  updateGuestPhoneChallenge: vi.fn(),
}));

import * as db from "./db";
import { guestPortalRouter } from "./routers/guestPortal";

const ctx: TrpcContext = { user: null, req: { protocol: "https", headers: {} } as TrpcContext["req"], res: {} as TrpcContext["res"] };

describe("تحقق هاتف العميل", () => {
  it("لا ينشئ رمزاً أو يرسل رسالة عند غياب اعتماد مزود SMS", async () => {
    vi.mocked(db.validateInvitation).mockResolvedValue({ invitation: { id: 17 }, reason: undefined } as never);
    const caller = guestPortalRouter.createCaller(ctx);
    const result = await caller.requestOtp({ inviteCode: "ABCDEFGH", phone: "+966512345678" });

    expect(result).toEqual({ status: "provider_not_configured", phone: "+966512345678" });
    expect(db.createGuestPhoneChallenge).not.toHaveBeenCalled();
  });
});
