import { describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

vi.mock("./db", () => ({
  createAgentAlert: vi.fn(),
  createAgentMessage: vi.fn(),
  createAgentProposal: vi.fn(),
  createAgentThread: vi.fn(),
  getAgentProposal: vi.fn(),
  getAgentThread: vi.fn(),
  listAgentAlerts: vi.fn(),
  listAgentMessages: vi.fn(),
  listAgentProposals: vi.fn(),
  listAgentThreads: vi.fn(),
  setSafeSetting: vi.fn(),
  updateAgentAlert: vi.fn(),
  updateAgentProposal: vi.fn(),
  updateAgentThread: vi.fn(),
}));
vi.mock("./geminiAgent", () => ({
  allowedSettingKeys: ["brand.primaryColor"],
  createAgentPlan: vi.fn(),
}));

import * as db from "./db";
import { createAgentPlan } from "./geminiAgent";
import { appRouter } from "./routers";

const context: TrpcContext = { user: null, req: { protocol: "https", headers: {} } as TrpcContext["req"], res: {} as TrpcContext["res"] };

describe("موافقة وكيل التطبيق", () => {
  it("يحفظ المعاينة أولاً ولا يطبق إعداد اللون إلا بعد الموافقة الصريحة", async () => {
    vi.mocked(db.getAgentThread).mockResolvedValue({ id: 7, status: "active" } as never);
    vi.mocked(db.listAgentMessages).mockResolvedValue([] as never);
    vi.mocked(db.createAgentMessage).mockResolvedValue({ id: 1 } as never);
    vi.mocked(createAgentPlan).mockResolvedValue({
      response: "هذه معاينة.",
      proposal: { title: "تحديث اللون", summary: "تعديل اللون", actionType: "update_setting", actionPayload: { settingKey: "brand.primaryColor", settingValue: "#1D4ED8" }, impact: "يتغير اللون." },
    });
    vi.mocked(db.createAgentProposal).mockResolvedValue({ id: 31 } as never);
    vi.mocked(db.getAgentProposal).mockResolvedValue({ id: 31, threadId: 7, status: "draft", actionType: "update_setting", actionPayload: JSON.stringify({ settingKey: "brand.primaryColor", settingValue: "#1D4ED8" }) } as never);
    vi.mocked(db.updateAgentProposal).mockResolvedValue({ id: 31, status: "executed" } as never);

    const caller = appRouter.createCaller(context);
    await caller.agent.send({ threadId: 7, message: "غيّر اللون." });

    expect(db.createAgentProposal).toHaveBeenCalledWith(expect.objectContaining({ actionType: "update_setting" }));
    expect(db.setSafeSetting).not.toHaveBeenCalled();

    await caller.agent.approve({ id: 31 });

    expect(db.setSafeSetting).toHaveBeenCalledWith("brand.primaryColor", "#1D4ED8", null);
    expect(db.updateAgentProposal).toHaveBeenCalledWith(31, expect.objectContaining({ status: "approved" }));
    expect(db.updateAgentProposal).toHaveBeenCalledWith(31, expect.objectContaining({ status: "executed" }));
  });
});
