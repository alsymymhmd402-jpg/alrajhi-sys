import { describe, expect, it, vi } from "vitest";
import { startVoiceConversion, voiceConversionFailureMessage, voiceFallbackNotice } from "./voiceConversion";

describe("رسائل الرجوع للصوت الطبيعي", () => {
  it("يحافظ على سبب نقص رصيد ElevenLabs لكي يظهر بوضوح داخل المكالمة", () => {
    const message = voiceConversionFailureMessage(new Error("رصيد ElevenLabs غير كافٍ لتوليد أو تحويل الصوت حالياً."));

    expect(message).toContain("رصيد ElevenLabs غير كافٍ");
  });

  it("يعرض رسالة آمنة عند عدم توفر سبب خطأ من المزود", () => {
    expect(voiceConversionFailureMessage(null)).toBe("تعذر تحويل الصوت من ElevenLabs.");
  });

  it("يحافظ على رسالة الفشل التي تصل كسلسلة من مسار المكالمة", () => {
    expect(voiceConversionFailureMessage("رصيد ElevenLabs غير كافٍ لتوليد أو تحويل الصوت حالياً.")).toContain("رصيد ElevenLabs غير كافٍ");
  });

  it("ينشئ الإشعار المعروض في واجهة مكالمة المالك عند فشل ElevenLabs", () => {
    expect(voiceFallbackNotice(new Error("رصيد ElevenLabs غير كافٍ لتوليد أو تحويل الصوت حالياً."))).toBe("عاد الاتصال إلى الصوت الطبيعي. رصيد ElevenLabs غير كافٍ لتوليد أو تحويل الصوت حالياً.");
  });

  it("يبقي دفق الميكروفون الطبيعي للمكالمة ويبلغ الواجهة عند تعذر تجهيز التحويل", async () => {
    const stream = {} as MediaStream;
    const onError = vi.fn();
    vi.stubGlobal("MediaRecorder", class MediaRecorderStub {});
    vi.stubGlobal("AudioContext", class FailingAudioContext {
      constructor() {
        throw new Error("رصيد ElevenLabs غير كافٍ لتوليد أو تحويل الصوت حالياً.");
      }
    });

    try {
      const session = await startVoiceConversion({
        inputStream: stream,
        modelId: 1,
        convertChunk: vi.fn(),
        onError,
      });

      expect(session.stream).toBe(stream);
      expect(onError).toHaveBeenCalledWith("رصيد ElevenLabs غير كافٍ لتوليد أو تحويل الصوت حالياً.");
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
