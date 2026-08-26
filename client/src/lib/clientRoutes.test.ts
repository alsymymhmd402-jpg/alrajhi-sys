import { describe, expect, it } from "vitest";
import { getClientChatPath, getClientSectionPath } from "./clientRoutes";

describe("تنقل تطبيق العميل", () => {
  it("يبني مسارات الواجهات الأربع داخل نطاق العميل فقط", () => {
    expect(getClientSectionPath("guest-123", "support")).toBe("/client/guest-123/messages");
    expect(getClientSectionPath("guest-123", "institution")).toBe("/client/guest-123/institution");
    expect(getClientSectionPath("guest-123", "profile")).toBe("/client/guest-123/profile");
    expect(getClientSectionPath("guest-123", "application")).toBe("/client/guest-123/application");
  });

  it("يفتح خدمة العملاء في المحادثة مباشرة ولا يوجه إلى صفحة المؤسسة", () => {
    expect(getClientChatPath("guest-123")).toBe("/client/guest-123/chat");
    expect(getClientChatPath("guest-123", "finance")).toBe("/client/guest-123/chat?mode=finance");
  });
});
