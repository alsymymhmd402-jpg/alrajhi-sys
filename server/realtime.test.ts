import { describe, expect, it, vi } from "vitest";
import { emitChatMessageTo } from "./realtime";

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
