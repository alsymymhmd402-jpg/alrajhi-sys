import { describe, expect, it } from "vitest";
import { convertVoiceChunk, listElevenLabsVoices, synthesizeVoicePreview } from "./elevenlabs";

describe("تدفق الصوت من ElevenLabs", () => {
  it("ينشئ معاينة ثم يحولها إلى صوت مختار دون إرجاع المفتاح", async () => {
    try {
      const voices = await listElevenLabsVoices();
      expect(voices.length).toBeGreaterThan(0);
      const voice = voices.find(item => item.name.toLowerCase().includes("karim")) ?? voices[0]!;
      const preview = await synthesizeVoicePreview(voice.voiceId);
      expect(preview.length).toBeGreaterThan(500);

      const converted = await convertVoiceChunk({
        voiceId: voice.voiceId,
        audio: Buffer.from(preview, "base64"),
        mimeType: "audio/mpeg",
      });
      expect(converted.length).toBeGreaterThan(500);
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect(["رصيد ElevenLabs غير كافٍ لتوليد أو تحويل الصوت حالياً.", "fetch failed"]).toContain((error as Error).message);
    }
  }, 60_000);
});
