import { describe, expect, it } from "vitest";
import { supportChannelSchema } from "./routers/support";

describe("عقد قنوات مراسلة العملاء", () => {
  it("يقبل القنوات الثلاث ويتيح تعيين قناة المؤسسة كافتراضي لعقود الإدخال", () => {
    expect(supportChannelSchema.optional().default("institution").parse(undefined)).toBe("institution");
    expect(supportChannelSchema.parse("finance")).toBe("finance");
    expect(supportChannelSchema.parse("follow_up")).toBe("follow_up");
    expect(() => supportChannelSchema.parse("assistant")).toThrow();
  });
});
