import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  listSafeSettings: vi.fn(),
  listSupportMessages: vi.fn(),
  addOwnerMessage: vi.fn(),
  invokeLLM: vi.fn(),
}));

vi.mock("./db", () => ({
  listSafeSettings: mocks.listSafeSettings,
  listSupportMessages: mocks.listSupportMessages,
  addOwnerMessage: mocks.addOwnerMessage,
}));
vi.mock("./_core/llm", () => ({ invokeLLM: mocks.invokeLLM }));

import { generateCustomerAutoReply } from "./customerResponder";

describe("وكيل رد العملاء", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.listSafeSettings.mockResolvedValue([]);
    mocks.listSupportMessages.mockResolvedValue([{ sender: "guest", content: "مرحباً" }]);
    mocks.addOwnerMessage.mockResolvedValue({ id: 99, sender: "owner", content: "رد" });
  });

  it("ينشئ رداً من النموذج للقناة المحددة", async () => {
    mocks.invokeLLM.mockResolvedValue({ choices: [{ message: { content: "أهلاً، يسعدنا مساعدتك." } }] });
    await generateCustomerAutoReply({ conversationId: 7, guestName: "عميل", channel: "finance", content: "كيف أتابع طلبي؟" });
    expect(mocks.invokeLLM).toHaveBeenCalledWith(expect.objectContaining({ model: "gpt-5-mini" }));
    expect(mocks.addOwnerMessage).toHaveBeenCalledWith(7, "أهلاً، يسعدنا مساعدتك.", "finance");
  });

  it("لا يرسل رداً عندما يكون الوكيل متوقفاً", async () => {
    mocks.listSafeSettings.mockResolvedValue([{ settingKey: "ai.customer.enabled", settingValue: "false" }]);
    const result = await generateCustomerAutoReply({ conversationId: 6, guestName: "عميل", channel: "institution", content: "مرحباً" });
    expect(result).toBeUndefined();
    expect(mocks.invokeLLM).not.toHaveBeenCalled();
    expect(mocks.addOwnerMessage).not.toHaveBeenCalled();
  });

  it("يحيل الطلب الحساس دون استدعاء النموذج", async () => {
    await generateCustomerAutoReply({ conversationId: 8, guestName: "عميل", channel: "follow_up", content: "ما حالة طلبي؟" });
    expect(mocks.invokeLLM).not.toHaveBeenCalled();
    expect(mocks.addOwnerMessage).toHaveBeenCalledWith(8, expect.stringContaining("فريق الدعم"), "follow_up");
  });
});
