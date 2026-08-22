import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ storagePut: vi.fn() }));
vi.mock("./storage", () => ({ storagePut: mocks.storagePut }));

import { appendStatusMediaChunk, beginStatusMediaUpload, finishStatusMediaUpload } from "./statusMediaUpload";

describe("رفع وسائط حالات المؤسسة", () => {
  it("يجمع أجزاء ملف الصورة بالترتيب ويخزنها بعد تحقق الحجم", async () => {
    mocks.storagePut.mockResolvedValue({ key: "institution-statuses/published.png", url: "/manus-storage/institution-statuses/published.png" });
    const bytes = Buffer.from("status-media-content");
    const encoded = bytes.toString("base64url");
    const first = encoded.slice(0, 8).split("").reverse().join("");
    const second = encoded.slice(8).split("").reverse().join("");
    const session = beginStatusMediaUpload({ fileName: "announcement.png", mimeType: "image/png", size: bytes.byteLength, totalChunks: 2 });

    appendStatusMediaChunk({ uploadId: session.uploadId, index: 0, data: first });
    appendStatusMediaChunk({ uploadId: session.uploadId, index: 1, data: second });
    await expect(finishStatusMediaUpload(session.uploadId)).resolves.toEqual({ key: "institution-statuses/published.png", url: "/manus-storage/institution-statuses/published.png" });
    expect(mocks.storagePut).toHaveBeenCalledWith(expect.stringMatching(/^institution-statuses\//), bytes, "image/png");
  });

  it("يرفض الملف الذي يعلن حجماً مختلفاً عن الأجزاء المرفوعة", async () => {
    const session = beginStatusMediaUpload({ fileName: "invalid.jpg", mimeType: "image/jpeg", size: 20, totalChunks: 1 });
    appendStatusMediaChunk({ uploadId: session.uploadId, index: 0, data: Buffer.from("short").toString("base64url").split("").reverse().join("") });
    await expect(finishStatusMediaUpload(session.uploadId)).rejects.toThrow("تعذر التحقق من حجم الوسيط");
  });
});
