import { describe, expect, it } from "vitest";
import { supportChannelMeta, supportChannelValues } from "./supportChannels";

describe("قنوات مراسلة المؤسسة", () => {
  it("تعرّف ثلاث قنوات مستقلة ومتطابقة بين العميل وغرفة العمليات", () => {
    expect(supportChannelValues).toEqual(["institution", "finance", "follow_up"]);
    expect(supportChannelMeta.institution.label).toBe("مراسلة المؤسسة");
    expect(supportChannelMeta.finance.label).toBe("نظام الإدارة المالية");
    expect(supportChannelMeta.follow_up.label).toBe("فريق دعم متابعة طلبك");
  });
});
