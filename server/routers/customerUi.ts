import { z } from "zod";
import { customerUiDocumentSchema, defaultCustomerUiDocument } from "../../shared/customerUi";
import * as db from "../db";
import { publicProcedure, router } from "../_core/trpc";

const contactIdSchema = z.object({ contactId: z.number().int().positive() });
const guestSchema = z.object({ publicId: z.string().min(8).max(24), accessToken: z.string().min(16).max(64) });
const documentInput = z.object({ document: customerUiDocumentSchema, summary: z.string().trim().min(3).max(500), name: z.string().trim().min(2).max(160).optional() });

async function contactForConfig(contactId: number) {
  const details = await db.getContactDetails(contactId);
  if (!details) throw new Error("العميل غير موجود.");
  return details.contact;
}

export const customerUiRouter = router({
  editor: publicProcedure.input(contactIdSchema).query(async ({ input }) => {
    const contact = await contactForConfig(input.contactId);
    const config = await db.ensureCustomerUiConfig({ contactId: contact.id, name: `واجهة ${contact.displayName}`, document: JSON.stringify(defaultCustomerUiDocument) });
    const [revisions, templates, activity] = await Promise.all([db.listCustomerUiRevisions(contact.id), db.listCustomerUiTemplates(), db.listCustomerUiAuditLogs(contact.id)]);
    return { contact, config, revisions, templates, activity };
  }),
  saveDraft: publicProcedure.input(contactIdSchema.merge(documentInput)).mutation(async ({ input }) => {
    const contact = await contactForConfig(input.contactId);
    return db.saveCustomerUiRevision({ contactId: contact.id, name: input.name ?? `واجهة ${contact.displayName}`, document: JSON.stringify(input.document), summary: input.summary });
  }),
  publish: publicProcedure.input(contactIdSchema.merge(documentInput)).mutation(async ({ input }) => {
    const contact = await contactForConfig(input.contactId);
    return db.saveCustomerUiRevision({ contactId: contact.id, name: input.name ?? `واجهة ${contact.displayName}`, document: JSON.stringify(input.document), summary: input.summary, publish: true });
  }),
  restore: publicProcedure.input(contactIdSchema.extend({ revisionId: z.number().int().positive() })).mutation(async ({ input }) => {
    const contact = await contactForConfig(input.contactId);
    const revision = await db.getCustomerUiRevision(contact.id, input.revisionId);
    if (!revision) throw new Error("هذه النسخة غير متاحة لهذا العميل.");
    const document = customerUiDocumentSchema.parse(JSON.parse(revision.document));
    return db.saveCustomerUiRevision({ contactId: contact.id, name: `واجهة ${contact.displayName}`, document: JSON.stringify(document), summary: `استعادة النسخة ${revision.version}`, restored: true });
  }),
  saveTemplate: publicProcedure.input(z.object({ name: z.string().trim().min(2).max(160), description: z.string().trim().max(500).nullable().optional(), document: customerUiDocumentSchema })).mutation(({ input }) => db.createCustomerUiTemplate({ name: input.name, description: input.description, document: JSON.stringify(input.document) })),
  applyTemplate: publicProcedure.input(contactIdSchema.extend({ templateId: z.number().int().positive() })).mutation(async ({ input }) => {
    const contact = await contactForConfig(input.contactId);
    const templates = await db.listCustomerUiTemplates();
    const template = templates.find(item => item.id === input.templateId);
    if (!template) throw new Error("القالب غير متاح.");
    const document = customerUiDocumentSchema.parse(JSON.parse(template.document));
    return db.saveCustomerUiRevision({ contactId: contact.id, name: `واجهة ${contact.displayName}`, document: JSON.stringify(document), summary: `تطبيق قالب: ${template.name}`, auditAction: "template_applied" });
  }),
  removeTemplate: publicProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ input }) => { await db.removeCustomerUiTemplate(input.id); return { success: true }; }),
  guestPublished: publicProcedure.input(guestSchema).query(async ({ input }) => {
    const conversation = await db.getGuestConversation(input.publicId, input.accessToken);
    if (!conversation?.contactId) throw new Error("لم يتم العثور على جلسة العميل.");
    const revision = await db.getPublishedCustomerUiDocument(conversation.contactId);
    return revision ? { revision, document: customerUiDocumentSchema.parse(JSON.parse(revision.document)) } : null;
  }),
  guestNotifications: publicProcedure.input(guestSchema).query(async ({ input }) => {
    const conversation = await db.getGuestConversation(input.publicId, input.accessToken);
    if (!conversation?.contactId) throw new Error("لم يتم العثور على جلسة العميل.");
    return db.listCustomerUiNotifications(conversation.contactId);
  }),
  markNotificationRead: publicProcedure.input(guestSchema.extend({ notificationId: z.number().int().positive() })).mutation(async ({ input }) => {
    const conversation = await db.getGuestConversation(input.publicId, input.accessToken);
    if (!conversation?.contactId) throw new Error("لم يتم العثور على جلسة العميل.");
    await db.markCustomerUiNotificationRead(conversation.contactId, input.notificationId);
    return { success: true };
  }),
});
