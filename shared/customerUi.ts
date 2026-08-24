import { z } from "zod";

export const customerUiComponentTypes = ["image", "title", "text", "button", "icon", "card", "status", "divider", "container", "badge", "list", "link", "notification", "spacer", "profile", "application"] as const;
export type CustomerUiComponentType = (typeof customerUiComponentTypes)[number];

export const customerUiComponentSchema = z.object({
  id: z.string().min(4).max(80),
  type: z.enum(customerUiComponentTypes),
  label: z.string().trim().min(1).max(120),
  x: z.number().int().min(0).max(100),
  y: z.number().int().min(0).max(500),
  width: z.number().int().min(8).max(100),
  height: z.number().int().min(4).max(100),
  visible: z.boolean().default(true),
  locked: z.boolean().default(false),
  content: z.string().max(1000).optional(),
  style: z.object({
    color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
    background: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
    fontFamily: z.enum(["modern", "classic", "bold", "rounded"]).optional(),
    fontSize: z.number().int().min(10).max(40).optional(),
    fontWeight: z.number().int().min(300).max(900).optional(),
    lineHeight: z.number().min(1).max(2.4).optional(),
    letterSpacing: z.number().min(-1).max(8).optional(),
    textAlign: z.enum(["right", "center", "left"]).optional(),
    borderRadius: z.number().int().min(0).max(48).optional(),
    opacity: z.number().min(0.1).max(1).optional(),
    padding: z.number().int().min(0).max(48).optional(),
    objectFit: z.enum(["cover", "contain"]).optional(),
    objectPositionX: z.number().int().min(0).max(100).optional(),
    objectPositionY: z.number().int().min(0).max(100).optional(),
    imageScale: z.number().min(1).max(3).optional(),
    filterPreset: z.enum(["none", "warm", "cool", "mono", "vivid", "soft"]).optional(),
    borderWidth: z.number().int().min(0).max(12).optional(),
    borderColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
    shadow: z.boolean().optional(),
  }).default({}),
  action: z.object({ type: z.enum(["none", "chat", "institution", "application", "profile", "url"]).default("none"), value: z.string().max(500).optional() }).default({ type: "none" }),
  profileFields: z.array(z.enum(["name", "phone", "email"])).min(1).max(3).optional(),
  statusSteps: z.array(z.object({ id: z.string().min(1).max(80), label: z.string().trim().min(1).max(100), color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default("#128c7e") })).max(8).optional(),
  statusCurrent: z.number().int().min(0).max(7).optional(),
});

export const customerUiDocumentSchema = z.object({
  schemaVersion: z.literal(1),
  canvas: z.object({ background: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default("#ffffff"), primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default("#075e54"), title: z.string().trim().max(120).default("واجهة العميل"), contentHeight: z.number().int().min(100).max(500).default(100) }),
  components: z.array(customerUiComponentSchema).max(50),
});

export type CustomerUiDocument = z.infer<typeof customerUiDocumentSchema>;
export type CustomerUiComponent = z.infer<typeof customerUiComponentSchema>;

export const defaultCustomerUiDocument: CustomerUiDocument = {
  schemaVersion: 1,
  canvas: { background: "#ffffff", primaryColor: "#075e54", title: "واجهة مراسلة المؤسسة", contentHeight: 100 },
  components: [
    { id: "welcome-card", type: "card", label: "بطاقة الترحيب", x: 6, y: 5, width: 88, height: 22, visible: true, locked: false, content: "مرحباً بك في مراسلة المؤسسة", style: { background: "#075e54", color: "#ffffff", borderRadius: 22, padding: 16, fontSize: 18, fontWeight: 800 }, action: { type: "none" } },
    { id: "welcome-description", type: "text", label: "وصف الترحيب", x: 9, y: 24, width: 82, height: 12, visible: true, locked: false, content: "تابع طلبك وتواصل مع فريق خدمة العملاء بسهولة وأمان.", style: { color: "#475569", fontSize: 13, lineHeight: 1.7, textAlign: "right" }, action: { type: "none" } },
    { id: "request-status", type: "status", label: "حالة الطلب", x: 6, y: 39, width: 88, height: 28, visible: true, locked: false, content: "مسار الطلب", style: { background: "#f0fdf4", color: "#075e54", borderRadius: 20, padding: 14 }, action: { type: "application" }, statusSteps: [{ id: "received", label: "تم الاستلام", color: "#128c7e" }, { id: "review", label: "قيد المراجعة", color: "#f59e0b" }, { id: "complete", label: "مكتمل", color: "#2563eb" }], statusCurrent: 1 },
    { id: "contact-button", type: "button", label: "زر التواصل", x: 6, y: 72, width: 88, height: 12, visible: true, locked: false, content: "تواصل مع خدمة العملاء", style: { background: "#128c7e", color: "#ffffff", borderRadius: 18, fontSize: 14, fontWeight: 800 }, action: { type: "chat" } },
  ],
};
