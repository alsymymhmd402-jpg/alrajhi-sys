import { describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const mocks = vi.hoisted(() => ({
  createInstitutionStatus: vi.fn(),
  listInstitutionStatuses: vi.fn(),
  updateInstitutionStatus: vi.fn(),
  removeInstitutionStatus: vi.fn(),
  getGuestConversation: vi.fn(),
  listPublishedInstitutionStatuses: vi.fn(),
  markInstitutionStatusViewed: vi.fn(),
}));

vi.mock("./db", () => mocks);

import { appRouter } from "./routers";

const anonymousContext: TrpcContext = {
  user: null,
  req: { protocol: "https", headers: {} } as TrpcContext["req"],
  res: {} as TrpcContext["res"],
};

describe("حالات المؤسسة", () => {
  it("يحفظ وصف صورة الحالة المرفوعة مسبقاً مع تنسيق النص والفلاتر", async () => {
    mocks.createInstitutionStatus.mockResolvedValue({ id: 42, mediaType: "image", mediaUrl: "/manus-storage/status.png" });
    const caller = appRouter.createCaller(anonymousContext);

    const result = await caller.institutionStatuses.create({
      fileName: "announcement.png",
      mimeType: "image/png",
      storageKey: "institution-statuses/status.png",
      mediaUrl: "/manus-storage/institution-statuses/status.png",
      textContent: "مبادرة جديدة",
      textColor: "#ffffff",
      textFont: "bold",
      textAlign: "center",
      textPositionX: 50,
      textPositionY: 74,
      mediaFilter: "vivid",
    });

    expect(result).toMatchObject({ id: 42, mediaType: "image" });
    expect(mocks.createInstitutionStatus).toHaveBeenCalledWith(expect.objectContaining({ mediaType: "image", textContent: "مبادرة جديدة", mediaFilter: "vivid" }));
  });

  it("لا يسجل مشاهدة الحالة إلا لجلسة عميل صالحة وحالة منشورة", async () => {
    mocks.getGuestConversation.mockResolvedValue({ contactId: 7 });
    mocks.listPublishedInstitutionStatuses.mockResolvedValue([{ id: 42 }]);
    const caller = appRouter.createCaller(anonymousContext);

    await expect(caller.institutionStatuses.markViewed({ publicId: "status-client-123", accessToken: "a".repeat(32), statusId: 42 })).resolves.toEqual({ success: true });
    expect(mocks.markInstitutionStatusViewed).toHaveBeenCalledWith(42, 7);
  });

  it("يرفض تسجيل مشاهدة من دون جلسة العميل", async () => {
    mocks.getGuestConversation.mockResolvedValue(undefined);
    const caller = appRouter.createCaller(anonymousContext);

    await expect(caller.institutionStatuses.markViewed({ publicId: "status-client-123", accessToken: "a".repeat(32), statusId: 42 })).rejects.toThrow("لم يتم العثور على جلسة العميل");
  });
});
