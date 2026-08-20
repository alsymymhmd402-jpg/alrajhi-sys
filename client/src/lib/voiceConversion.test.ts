import { describe, expect, it } from "vitest";
import { voiceConversionFailureMessage } from "./voiceConversion";

describe("رسائل الرجوع للصوت الطبيعي", () => {
  it("يحافظ على سبب نقص رصيد ElevenLabs لكي يظهر بوضوح داخل المكالمة", () => {
    const message = voiceConversionFailureMessage(new Error("رصيد ElevenLabs غير كافٍ لتوليد أو تحويل الصوت حالياً."));

    expect(message).toContain("رصيد ElevenLabs غير كافٍ");
  });

  it("يعرض رسالة آمنة عند عدم توفر سبب خطأ من المزود", () => {
    expect(voiceConversionFailureMessage(null)).toBe("تعذر تحويل الصوت من ElevenLabs.");
  });
});
