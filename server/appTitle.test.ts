import { describe, expect, it } from "vitest";

describe("application title configuration", () => {
  it("is available when calling the lightweight app endpoint", async () => {
    const title = process.env.VITE_APP_TITLE;
    expect(title).toBe("مراسلة المؤسسة");

    const response = await fetch("http://127.0.0.1:3000/", {
      headers: { "x-application-title": encodeURIComponent(title) },
    });

    expect(response.ok).toBe(true);
  });
});
