import { describe, expect, it } from "vitest";
import { getClientAppStartPath, isClientExperiencePath } from "./clientPwa";

describe("هوية تطبيق مراسلة المؤسسة", () => {
  it("تميّز واجهة العميل عن غرفة العمليات بحسب المسار", () => {
    expect(isClientExperiencePath("/invite/مباشر")).toBe(true);
    expect(isClientExperiencePath("/client/guest-a")).toBe(true);
    expect(isClientExperiencePath("/client/guest-a/chat")).toBe(true);
    expect(isClientExperiencePath("/")).toBe(false);
    expect(isClientExperiencePath("/dashboard/chats")).toBe(false);
  });

  it("يعيد نقطة بداية العميل إلى قائمة المحادثات من جميع مسارات التطبيق الداخلية", () => {
    expect(getClientAppStartPath("/client/guest-a")).toBe("/client/guest-a");
    expect(getClientAppStartPath("/client/guest-a/chat")).toBe("/client/guest-a");
    expect(getClientAppStartPath("/client/guest-a/privacy")).toBe("/client/guest-a");
    expect(getClientAppStartPath("/invite/مباشر")).toBe("");
  });
});
