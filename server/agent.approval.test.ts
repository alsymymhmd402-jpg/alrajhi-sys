import { describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

vi.mock("./db", () => ({
  createAgentAlert: vi.fn(),
  createAgentMessage: vi.fn(),
  createAgentProposal: vi.fn(),
  createAgentThread: vi.fn(),
  getAgentProposal: vi.fn(),
  getSafeSetting: vi.fn(),
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
  isAllowedSettingValue: vi.fn(() => true),
}));

import * as db from "./db";
import { createAgentPlan } from "./geminiAgent";
import { appRouter } from "./routers";

const context: TrpcContext = { user: null, req: { protocol: "https", headers: {} } as TrpcContext["req"], res: {} as TrpcContext["res"] };

describe("موافقة وكيل التطبيق", () => {
  it("يعرض تنبيهات غرفة المعالجة حسب الحالة المطلوبة", async () => {
    const alerts = [{ id: 91, severity: "error", status: "open", title: "خطأ اختبار", detail: "تفاصيل الخطأ", source: "client" }];
    vi.mocked(db.listAgentAlerts).mockResolvedValue(alerts as never);
    const caller = appRouter.createCaller(context);

    await expect(caller.agent.alerts({ status: "open" })).resolves.toEqual(alerts);
    expect(db.listAgentAlerts).toHaveBeenCalledWith("open");
  });

  it("يحفظ المعاينة ثم ينفذ إعداد اللون ويتحقق منه بعد الموافقة الصريحة", async () => {
    vi.mocked(db.getAgentThread).mockResolvedValue({ id: 7, status: "active" } as never);
    vi.mocked(db.listAgentMessages).mockResolvedValue([] as never);
    vi.mocked(db.createAgentMessage).mockResolvedValue({ id: 1 } as never);
    vi.mocked(createAgentPlan).mockResolvedValue({
      response: "هذه معاينة.",
      proposal: { title: "تحديث اللون", summary: "تعديل اللون", actionType: "update_setting", actionPayload: { settingKey: "brand.primaryColor", settingValue: "#1D4ED8" }, impact: "يتغير اللون." },
    });
    vi.mocked(db.createAgentProposal).mockResolvedValue({ id: 31 } as never);
    vi.mocked(db.getAgentProposal)
      .mockResolvedValueOnce({ id: 31, threadId: 7, status: "draft", actionType: "update_setting", actionPayload: JSON.stringify({ settingKey: "brand.primaryColor", settingValue: "#1D4ED8" }) } as never)
      .mockResolvedValueOnce({ id: 31, threadId: 7, status: "approved", actionType: "update_setting", actionPayload: JSON.stringify({ settingKey: "brand.primaryColor", settingValue: "#1D4ED8" }) } as never);
    vi.mocked(db.getSafeSetting).mockResolvedValue({ settingKey: "brand.primaryColor", settingValue: "#1D4ED8" } as never);
    vi.mocked(db.updateAgentProposal).mockImplementation(async (_id, input) => ({ id: 31, status: input.status ?? "approved", ...input }) as never);

    const caller = appRouter.createCaller(context);
    await caller.agent.send({ threadId: 7, message: "غيّر اللون." });

    expect(db.createAgentProposal).toHaveBeenCalledWith(expect.objectContaining({ actionType: "update_setting" }));
    expect(db.setSafeSetting).not.toHaveBeenCalled();

    await caller.agent.approve({ id: 31 });

    expect(db.setSafeSetting).not.toHaveBeenCalled();
    expect(db.updateAgentProposal).toHaveBeenCalledWith(31, expect.objectContaining({ status: "approved", executionProgress: 8 }));

    await caller.agent.execute({ id: 31 });

    expect(db.setSafeSetting).toHaveBeenCalledWith("brand.primaryColor", "#1D4ED8", null);
    expect(db.getSafeSetting).toHaveBeenCalledWith("brand.primaryColor");
    expect(db.updateAgentProposal).toHaveBeenCalledWith(31, expect.objectContaining({ status: "executed", executionProgress: 100, verificationResult: expect.stringContaining("تم التحقق") }));
  });
});
