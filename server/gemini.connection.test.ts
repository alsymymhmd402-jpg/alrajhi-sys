import { describe, expect, it } from "vitest";

describe("اعتماد Gemini لوكيل التطبيق", () => {
  it("يتحقق من المفتاح عبر قائمة النماذج من دون كشفه", async () => {
    const apiKey = process.env.GEMINI_API_KEY;
    expect(apiKey).toBeTruthy();

    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models", {
      headers: { "x-goog-api-key": apiKey! },
    });

    expect(response.ok).toBe(true);
  }, 15_000);
});
