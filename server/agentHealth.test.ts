import { beforeEach, describe, expect, it, vi } from "vitest";
import { runAgentHealthReview } from "./agentHealth";

vi.mock("./db", () => ({
  getDb: vi.fn(),
  getOpenAgentAlertBySource: vi.fn(),
  createAgentAlert: vi.fn(),
}));

import * as db from "./db";

describe("الفحص الدوري لوكيل التطبيق", () => {
  beforeEach(() => vi.clearAllMocks());

  it("لا ينشئ تنبيهاً عند سلامة الاعتماد وقاعدة البيانات", async () => {
    vi.mocked(db.getDb).mockResolvedValue({} as never);
    const result = await runAgentHealthReview();
    expect(result).toMatchObject({ ok: true, issuesFound: 0, createdAlerts: [] });
    expect(db.createAgentAlert).not.toHaveBeenCalled();
  });

  it("يسجل المشكلة مرة واحدة فقط عند غياب اعتماد الوكيل", async () => {
    vi.mocked(db.getDb).mockResolvedValue({} as never);
    vi.mocked(db.getOpenAgentAlertBySource).mockResolvedValue(undefined);
    vi.mocked(db.createAgentAlert).mockResolvedValue({ id: 41 } as never);
    const original = process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_API_KEY;
    const result = await runAgentHealthReview();
    if (original) process.env.GEMINI_API_KEY = original;
    expect(result).toMatchObject({ issuesFound: 1, createdAlerts: [41] });
    expect(db.createAgentAlert).toHaveBeenCalledWith(expect.objectContaining({ source: "agent.health.gemini_credential" }));
  });
});
