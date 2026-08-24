import { beforeEach, describe, expect, it } from "vitest";
import { getClientSession, getInviteSession, saveClientSession, saveInviteSession } from "./clientSession";

class MemoryStorage {
  private values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
  clear() { this.values.clear(); }
}

const session = new MemoryStorage();
const persistent = new MemoryStorage();

Object.defineProperty(globalThis, "sessionStorage", { value: session, configurable: true });
Object.defineProperty(globalThis, "localStorage", { value: persistent, configurable: true });

describe("جلسة رابط العميل", () => {
  beforeEach(() => { session.clear(); persistent.clear(); });

  it("تعيد فتح رابط الدعوة على الجهاز نفسه بعد حفظ الجلسة مرة واحدة", () => {
    saveClientSession("client-001", "access-token-001");
    saveInviteSession("invite-001", "client-001");
    session.clear();

    expect(getInviteSession("invite-001")).toBe("client-001");
    expect(getClientSession("client-001")).toBe("access-token-001");
  });
});
