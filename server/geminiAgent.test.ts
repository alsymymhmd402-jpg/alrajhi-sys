import { describe, expect, it } from "vitest";
import { isAllowedSettingValue } from "./geminiAgent";

describe("قيم إعدادات وكيل التطبيق", () => {
  it("يقبل القيم التي يمكن تطبيقها فعلياً ويرفض القيم غير الآمنة", () => {
    expect(isAllowedSettingValue("brand.primaryColor", "#000000")).toBe(true);
    expect(isAllowedSettingValue("brand.primaryColor", "black")).toBe(false);
    expect(isAllowedSettingValue("brand.buttonRadius", "18px")).toBe(true);
    expect(isAllowedSettingValue("brand.buttonRadius", "100px")).toBe(false);
    expect(isAllowedSettingValue("guest.welcomeMessage", "أهلاً بك في مساحة التواصل مع المؤسسة.")).toBe(true);
    expect(isAllowedSettingValue("guest.welcomeMessage", "قصير")).toBe(false);
  });
});
