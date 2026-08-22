import { describe, expect, it } from "vitest";
import { getClientSectionPath } from "./clientRoutes";

describe("تنقل تطبيق العميل", () => {
  it("يبني مسارات الواجهات الأربع داخل نطاق العميل فقط", () => {
    expect(getClientSectionPath("guest-123", "support")).toBe("/client/guest-123/chat");
    expect(getClientSectionPath("guest-123", "institution")).toBe("/client/guest-123/institution");
    expect(getClientSectionPath("guest-123", "profile")).toBe("/client/guest-123/profile");
    expect(getClientSectionPath("guest-123", "application")).toBe("/client/guest-123/application");
  });
});
