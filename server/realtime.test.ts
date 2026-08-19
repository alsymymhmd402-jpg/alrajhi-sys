import { describe, expect, it, vi } from "vitest";
import * as db from "./db";
import { createMissedCallUpdate, emitChatMessageTo, MISSED_CALL_FAILURE_REASON, MISSED_CALL_TIMEOUT_MS, scheduleMissedCall } from "./realtime";

vi.mock("./db", () => ({
  getCallLog: vi.fn(),
  updateCallLog: vi.fn(),
}));

describe("emitChatMessageTo", () => {
  it("يبث تحديث الرسالة إلى غرفة المحادثة المحددة فقط", () => {
    const emit = vi.fn();
    const to = vi.fn(() => ({ emit }));
    const io = { to } as never;

    emitChatMessageTo(io, 42, { messageId: 19, sender: "guest" });

    expect(to).toHaveBeenCalledWith("chat:42");
    expect(emit).toHaveBeenCalledWith("chat:message", { messageId: 19, sender: "guest" });
  });
});

describe("منطق المكالمة الفائتة", () => {
  it("يسجل حالة فشل وسبباً واضحاً بعد مهلة الرنين المحددة", () => {
    const endedAt = new Date("2026-08-19T20:00:00.000Z");

    expect(MISSED_CALL_TIMEOUT_MS).toBe(30_000);
    expect(createMissedCallUpdate(endedAt)).toEqual({
      status: "failed",
      endedAt,
      failureReason: MISSED_CALL_FAILURE_REASON,
    });
    expect(MISSED_CALL_FAILURE_REASON).toMatch(/^مكالمة فائتة:/);
  });

  it("يحوّل مكالمة رنّانة إلى فائتة ويحدّث سجلها بعد 30 ثانية", async () => {
    vi.useFakeTimers();
    const emit = vi.fn();
    const to = vi.fn(() => ({ emit }));
    vi.mocked(db.getCallLog).mockResolvedValue({ status: "ringing" } as never);
    vi.mocked(db.updateCallLog).mockResolvedValue(undefined as never);

    scheduleMissedCall({ to } as never, 701);
    await vi.advanceTimersByTimeAsync(MISSED_CALL_TIMEOUT_MS);

    expect(db.updateCallLog).toHaveBeenCalledWith(701, expect.objectContaining({
      status: "failed",
      failureReason: expect.stringMatching(/^مكالمة فائتة:/),
    }));
    expect(to).toHaveBeenCalledWith("owner:lobby");
    expect(emit).toHaveBeenCalledWith("call:missed", expect.objectContaining({ callId: 701 }));
    vi.useRealTimers();
  });
});
