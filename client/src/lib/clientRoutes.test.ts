import { describe, expect, it } from "vitest";
import { getClientEntryPath, getClientSectionPath } from "./clientRoutes";

describe("تنقل تطبيق العميل", () => {
  it("يبني مسارات الواجهات الأربع داخل نطاق العميل فقط", () => {
    expect(getClientSectionPath("guest-123", "support")).toBe("/client/guest-123/chat");
    expect(getClientSectionPath("guest-123", "institution")).toBe("/client/guest-123/institution");
    expect(getClientSectionPath("guest-123", "profile")).toBe("/client/guest-123/profile");
    expect(getClientSectionPath("guest-123", "application")).toBe("/client/guest-123/application");
  });

  it("يفتح رابط العميل محتوى المؤسسة مباشرةً بعد تحقق الجلسة", () => {
    expect(getClientEntryPath("guest-42")).toBe("/client/guest-42/institution");
  });
});
