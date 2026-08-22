import { describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";
import { customerUiDocumentSchema, defaultCustomerUiDocument } from "../shared/customerUi";

const mocks = vi.hoisted(() => ({
  getContactDetails: vi.fn(),
  ensureCustomerUiConfig: vi.fn(),
  listCustomerUiRevisions: vi.fn(),
  listCustomerUiTemplates: vi.fn(),
  listCustomerUiAuditLogs: vi.fn(),
  saveCustomerUiRevision: vi.fn(),
  getCustomerUiRevision: vi.fn(),
  createCustomerUiTemplate: vi.fn(),
  removeCustomerUiTemplate: vi.fn(),
  getGuestConversation: vi.fn(),
  getPublishedCustomerUiDocument: vi.fn(),
  listCustomerUiNotifications: vi.fn(),
  markCustomerUiNotificationRead: vi.fn(),
}));

vi.mock("./db", () => mocks);

import { appRouter } from "./routers";

const anonymousContext: TrpcContext = {
  user: null,
  req: { protocol: "https", headers: {} } as TrpcContext["req"],
  res: {} as TrpcContext["res"],
};

describe("محرر واجهة العميل", () => {
  it("يحفظ نسخة منشورة مرتبطة بالعميل الصحيح فقط", async () => {
    mocks.getContactDetails.mockResolvedValue({ contact: { id: 8, displayName: "صالح" } });
    mocks.saveCustomerUiRevision.mockResolvedValue({ config: { id: 5, publishedVersion: 2 }, revision: { id: 9, version: 2, status: "published" } });
    const caller = appRouter.createCaller(anonymousContext);

    const result = await caller.customerUi.publish({ contactId: 8, document: defaultCustomerUiDocument, summary: "نشر واجهة مخصصة" });

    expect(result.revision).toMatchObject({ id: 9, status: "published" });
    expect(mocks.saveCustomerUiRevision).toHaveBeenCalledWith(expect.objectContaining({ contactId: 8, publish: true }));
    const savedDocument = JSON.parse(mocks.saveCustomerUiRevision.mock.calls[0]?.[0]?.document ?? "{}");
    expect(savedDocument).toMatchObject({ schemaVersion: 1, canvas: defaultCustomerUiDocument.canvas });
    expect(savedDocument.components).toHaveLength(defaultCustomerUiDocument.components.length);
  });

  it("يعيد للعميل النسخة المنشورة فقط بعد التحقق من جلسة الدعوة", async () => {
    mocks.getGuestConversation.mockResolvedValue({ contactId: 8 });
    mocks.getPublishedCustomerUiDocument.mockResolvedValue({ id: 9, version: 2, document: JSON.stringify(defaultCustomerUiDocument) });
    const caller = appRouter.createCaller(anonymousContext);

    const result = await caller.customerUi.guestPublished({ publicId: "customer-ui-123", accessToken: "a".repeat(32) });

    expect(result?.revision).toMatchObject({ id: 9, version: 2 });
    expect(result?.document.components).toHaveLength(defaultCustomerUiDocument.components.length);
    expect(mocks.getPublishedCustomerUiDocument).toHaveBeenCalledWith(8);
  });

  it("يرفض فتح واجهة منشورة من دون جلسة عميل صحيحة", async () => {
    mocks.getGuestConversation.mockResolvedValue(undefined);
    const caller = appRouter.createCaller(anonymousContext);

    await expect(caller.customerUi.guestPublished({ publicId: "customer-ui-123", accessToken: "a".repeat(32) })).rejects.toThrow("لم يتم العثور على جلسة العميل");
  });

  it("يعرض ويعلّم إشعارات التحديث للعميل نفسه فقط", async () => {
    mocks.getGuestConversation.mockResolvedValue({ contactId: 8 });
    mocks.listCustomerUiNotifications.mockResolvedValue([{ id: 31, title: "تم تحديث واجهة المراسلة", isRead: false }]);
    const caller = appRouter.createCaller(anonymousContext);

    await expect(caller.customerUi.guestNotifications({ publicId: "customer-ui-123", accessToken: "a".repeat(32) })).resolves.toHaveLength(1);
    await expect(caller.customerUi.markNotificationRead({ publicId: "customer-ui-123", accessToken: "a".repeat(32), notificationId: 31 })).resolves.toEqual({ success: true });
    expect(mocks.markCustomerUiNotificationRead).toHaveBeenCalledWith(8, 31);
  });

  it("يقبل تصميمًا طويلاً وخصائص قص الصورة ومرشحها عند حفظ واجهة العميل", () => {
    const document = customerUiDocumentSchema.parse({
      ...defaultCustomerUiDocument,
      canvas: { ...defaultCustomerUiDocument.canvas, contentHeight: 260 },
      components: [{
        ...defaultCustomerUiDocument.components[0],
        id: "hero-image-001",
        type: "image",
        label: "صورة مقصوصة",
        y: 180,
        content: "/manus-storage/customer-ui/hero.jpg",
        style: { ...defaultCustomerUiDocument.components[0].style, objectFit: "cover", objectPositionX: 72, objectPositionY: 24, imageScale: 1.4, filterPreset: "warm", borderWidth: 2, borderColor: "#ffffff", shadow: true },
      }],
    });

    expect(document.canvas.contentHeight).toBe(260);
    expect(document.components[0]?.style).toMatchObject({ objectPositionX: 72, objectPositionY: 24, imageScale: 1.4, filterPreset: "warm" });
  });
});
