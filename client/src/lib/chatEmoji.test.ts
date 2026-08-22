import { describe, expect, it } from "vitest";
import { appendChatEmoji, chatEmojiGroups } from "./chatEmoji";

describe("لوحة الرموز التعبيرية للمحادثة", () => {
  it("تضيف الرمز المختار من دون حذف نص الرسالة الحالي", () => {
    expect(appendChatEmoji("شكراً ", "🙏")).toBe("شكراً 🙏");
    expect(chatEmojiGroups).toHaveLength(3);
    expect(chatEmojiGroups.flatMap(group => group.emojis)).toContain("📞");
  });
});
