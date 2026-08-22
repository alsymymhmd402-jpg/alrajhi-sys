import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { OwnerVoiceFallbackNotice } from "./OwnerCallListener";

describe("إشعار رجوع مكالمة المالك للصوت الطبيعي", () => {
  it("يعرض سبب فشل ElevenLabs داخل واجهة المكالمة", () => {
    const markup = renderToStaticMarkup(createElement(OwnerVoiceFallbackNotice, {
      message: "عاد الاتصال إلى الصوت الطبيعي. رصيد ElevenLabs غير كافٍ لتوليد أو تحويل الصوت حالياً.",
    }));

    expect(markup).toContain('role="status"');
    expect(markup).toContain("عاد الاتصال إلى الصوت الطبيعي");
    expect(markup).toContain("رصيد ElevenLabs غير كافٍ");
  });

  it("لا يضيف مساحة أو رسالة عندما لا يكون هناك فشل", () => {
    expect(renderToStaticMarkup(createElement(OwnerVoiceFallbackNotice, { message: null }))).toBe("");
  });
});
