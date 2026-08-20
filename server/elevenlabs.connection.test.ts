import { describe, expect, it } from "vitest";

describe("اتصال ElevenLabs", () => {
  it("يتحقق من المفتاح عبر قائمة أصوات صغيرة دون طباعته", async () => {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    expect(apiKey).toMatch(/^sk_/);

    const response = await fetch("https://api.elevenlabs.io/v2/voices?page_size=1", {
      headers: { "xi-api-key": apiKey! },
    });

    expect(response.ok, `فشل تحقق ElevenLabs برمز ${response.status}`).toBe(true);
    const payload = await response.json() as { voices?: unknown[] };
    expect(Array.isArray(payload.voices)).toBe(true);
  }, 20_000);
});
