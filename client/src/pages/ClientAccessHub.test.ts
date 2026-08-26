import { describe, expect, it } from "vitest";
import { invitationCode } from "./ClientAccessHub";

describe("نقطة انطلاق تطبيق العميل", () => {
  it("تستخرج رمز الدعوة من الرابط الكامل أو تقبل الرمز المباشر", () => {
    expect(invitationCode("https://voicecall-uwxhmyez.manus.space/invite/Invite_123?source=android")).toBe("Invite_123");
    expect(invitationCode("  Invite-789  ")).toBe("Invite-789");
  });
});
