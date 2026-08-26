import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  listSafeSettings: vi.fn(),
  listSupportMessages: vi.fn(),
  addAiMessage: vi.fn(),
  invokeLLM: vi.fn(),
}));

vi.mock("./db", () => ({
  listSafeSettings: mocks.listSafeSettings,
  listSupportMessages: mocks.listSupportMessages,
  addAiMessage: mocks.addAiMessage,
}));
vi.mock("./_core/llm", () => ({ invokeLLM: mocks.invokeLLM }));

import { buildChannelSystemInstruction, generateCustomerAutoReply } from "./customerResponder";

describe("وكيل رد العملاء", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.listSafeSettings.mockResolvedValue([]);
    mocks.listSupportMessages.mockResolvedValue([{ sender: "guest", content: "مرحباً" }]);
    mocks.addAiMessage.mockResolvedValue({ id: 99, sender: "ai", content: "رد" });
  });

  it("ينشئ رداً من النموذج للقناة المحددة", async () => {
    mocks.invokeLLM.mockResolvedValue({ choices: [{ message: { content: "أهلاً، يسعدنا مساعدتك." } }] });
    await generateCustomerAutoReply({ conversationId: 7, guestName: "عميل", channel: "finance", content: "كيف أتابع طلبي؟" });
    expect(mocks.invokeLLM).toHaveBeenCalledWith(expect.objectContaining({ model: "gpt-5-mini" }));
    expect(mocks.addAiMessage).toHaveBeenCalledWith(7, "مرحباً عميل، أهلاً، يسعدنا مساعدتك.", "finance");
  });

  it("لا يرسل رداً عندما يكون الوكيل متوقفاً", async () => {
    mocks.listSafeSettings.mockResolvedValue([{ settingKey: "ai.customer.enabled", settingValue: "false" }]);
    const result = await generateCustomerAutoReply({ conversationId: 6, guestName: "عميل", channel: "institution", content: "مرحباً" });
    expect(result).toBeUndefined();
    expect(mocks.invokeLLM).not.toHaveBeenCalled();
    expect(mocks.addAiMessage).not.toHaveBeenCalled();
  });

  it("لا يرسل رداً عندما يوقف المالك الذكاء الاصطناعي لهذه المحادثة فقط", async () => {
    const result = await generateCustomerAutoReply({ conversationId: 12, guestName: "عميل", channel: "institution", content: "مرحباً", aiAutoReplyEnabled: false });
    expect(result).toBeUndefined();
    expect(mocks.invokeLLM).not.toHaveBeenCalled();
    expect(mocks.addAiMessage).not.toHaveBeenCalled();
  });

  it("يحيل الطلب الحساس دون استدعاء النموذج", async () => {
    await generateCustomerAutoReply({ conversationId: 8, guestName: "عميل", channel: "follow_up", content: "ما حالة طلبي؟" });
    expect(mocks.invokeLLM).not.toHaveBeenCalled();
    expect(mocks.addAiMessage).toHaveBeenCalledWith(8, expect.stringContaining("فريق متابعة الطلب"), "follow_up");
  });

  it("يحيل السؤال غير المرتبط بخدمات المؤسسة برد قصير من دون استدعاء النموذج", async () => {
    await generateCustomerAutoReply({ conversationId: 9, guestName: "ليان", channel: "institution", content: "كيف سيكون الطقس غداً؟" });
    expect(mocks.invokeLLM).not.toHaveBeenCalled();
    expect(mocks.addAiMessage).toHaveBeenCalledWith(9, expect.stringContaining("مرحباً ليان"), "institution");
  });

  it("يبني سياقاً مستقلاً لكل قناة ويمنع تقديم وعود مالية", () => {
    const finance = buildChannelSystemInstruction("finance", "التزم بالإيجاز.");
    const followUp = buildChannelSystemInstruction("follow_up", "التزم بالإيجاز.");
    expect(finance).toContain("لا تقدم نصيحة مالية");
    expect(finance).toContain("لا تؤكد مبالغ");
    expect(followUp).toContain("لا تعد بالقبول أو الرفض");
    expect(finance).toContain("جملة أو جملتين قصيرتين");
  });
});
