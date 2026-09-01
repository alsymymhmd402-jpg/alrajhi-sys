import { describe, expect, it } from "vitest";

const clientId = "861367092947-oef9r97upgbucfe9h05n9oi8jpvc05ak.apps.googleusercontent.com";

describe("Google customer OAuth configuration", () => {
  it("is accepted by Google's authorization endpoint", async () => {
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: "https://voicecall-uwxhmyez.manus.space/api/google/callback",
      response_type: "code",
      scope: "openid email profile",
      state: "configuration-check",
    });
    const response = await fetch(`https://accounts.google.com/o/oauth2/v2/auth?${params}`, { redirect: "manual" });
    const body = await response.text();
    expect(response.status).not.toBe(400);
    expect(body.toLowerCase()).not.toContain("invalid_client");
  }, 15_000);
});
