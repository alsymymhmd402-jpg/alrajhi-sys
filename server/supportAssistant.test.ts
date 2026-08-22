import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ invokeLLM: vi.fn() }));
vi.mock("./_core/llm", () => ({ invokeLLM: mocks.invokeLLM }));

import { decideSupportAssistantReply, requiresHumanSupport, supportAssistantHandoffReply } from "./supportAssistant";

describe("مساعد مؤسسة الوليد الإنسانية", () => {
  beforeEach(() => mocks.invokeLLM.mockReset());

  it("يحوّل الأسئلة الحساسة مباشرة إلى فريق الدعم من دون استدعاء النموذج", async () => {
    expect(requiresHumanSupport("ما حالة طلبي وهل تم قبوله؟")).toBe(true);
    const decision = await decideSupportAssistantReply({ content: "ما حالة طلبي وهل تم قبوله؟", history: [] });
    expect(decision).toEqual({ action: "handoff", reply: supportAssistantHandoffReply });
    expect(mocks.invokeLLM).not.toHaveBeenCalled();
  });

  it("يعرض إجابة عربية قصيرة للأسئلة العامة فقط", async () => {
    mocks.invokeLLM.mockResolvedValue({ choices: [{ message: { content: '{"action":"reply","reply":"مؤسسة الوليد الإنسانية جهة إنسانية، ويمكنك إرسال استفسارك هنا لمتابعته عند الحاجة."}' } }] });
    const decision = await decideSupportAssistantReply({ content: "ما هي المؤسسة؟", history: [{ sender: "guest", content: "مرحباً" }] });
    expect(decision.action).toBe("reply");
    expect(decision.reply).toContain("جهة إنسانية");
    expect(mocks.invokeLLM).toHaveBeenCalledTimes(1);
  });

  it("يفضّل التحويل الآمن عند رد غير صالح من النموذج", async () => {
    mocks.invokeLLM.mockResolvedValue({ choices: [{ message: { content: "رد غير منظم" } }] });
    await expect(decideSupportAssistantReply({ content: "كيف أستفيد؟", history: [] })).resolves.toEqual({ action: "handoff", reply: supportAssistantHandoffReply });
  });

});
