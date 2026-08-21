import { describe, expect, it } from "vitest";
import ClientSessionUnavailable from "./ClientSessionUnavailable";

describe("شاشة فقدان جلسة العميل", () => {
  it("تبني واجهة عربية مستقلة عند فتح مسار العميل بلا جلسة", () => {
    const element = ClientSessionUnavailable();
    expect(element.props.dir).toBe("rtl");
    expect(element.props.className).toContain("min-h-screen");
  });
});
