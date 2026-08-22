import { describe, expect, it } from "vitest";
import { getCustomerChatPath } from "../client/src/lib/customerChat";

describe("زر فتح محادثة العميل", () => {
  it("ينشئ مسار المحادثة المحددة عندما تكون متاحة", () => {
    expect(getCustomerChatPath(60001)).toBe("/dashboard/chats/60001");
  });

  it("يعود إلى مركز المحادثات عندما لا يملك العميل محادثة", () => {
    expect(getCustomerChatPath(null)).toBe("/dashboard/chats");
  });
});
