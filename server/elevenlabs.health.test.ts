import { afterEach, describe, expect, it, vi } from "vitest";
import { getElevenLabsProviderHealth } from "./elevenlabs";

afterEach(() => vi.unstubAllGlobals());

describe("حالة مزود ElevenLabs", () => {
  it("يعرض حالة آمنة وسعة متاحة من دون إرجاع المفتاح أو أرقام الرصيد", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ tier: "free", status: "free", character_count: 100, character_limit: 10_000 }), { status: 200 })));

    await expect(getElevenLabsProviderHealth()).resolves.toEqual({ connected: true, tier: "free", status: "free", capacity: "متاحة" });
  });

  it("يخفي تفاصيل المزود عند فشل استعلام الاشتراك", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("رفض", { status: 402 })));

    await expect(getElevenLabsProviderHealth()).resolves.toEqual({ connected: false, tier: null, status: "غير متاح", capacity: "غير معروفة" });
  });
});
