import { TRPCError } from "@trpc/server";
import { nanoid } from "nanoid";
import { z } from "zod";
import * as db from "../db";
import { notifyOwner } from "../_core/notification";
import { adminProcedure, publicProcedure, router } from "../_core/trpc";
import { storagePut } from "../storage";
import { emitRealtimeMessage } from "../realtime";

export const supportStatusSchema = z.enum(["open", "in_progress", "closed"]);
const guestAccessSchema = z.object({
  publicId: z.string().min(8).max(24),
  accessToken: z.string().min(16).max(64),
});
export const supportMessageSchema = z.string().trim().min(1, "لا يمكن إرسال رسالة فارغة.").max(4000, "الرسالة طويلة جداً.");
const guestProfileSchema = z.object({
  email: z.string().trim().email("يرجى كتابة بريد إلكتروني صحيح.").max(320).optional().or(z.literal("")),
  phone: z.string().trim().max(40).optional(),
  extraData: z.string().trim().max(2000).optional(),
  avatarFileName: z.string().trim().max(260).optional(),
  avatarMimeType: z.string().trim().max(140).optional(),
  avatarBase64: z.string().max(3_000_000).optional(),
});
const attachmentSchema = z.object({
  fileName: z.string().trim().min(1).max(260),
  mimeType: z.string().trim().min(3).max(140),
  base64: z.string().min(4).max(7_000_000),
  caption: z.string().trim().max(1000).optional(),
});
export const canReplyToConversation = (status: z.infer<typeof supportStatusSchema>) => status !== "closed";

function assertAttachmentType(mimeType: string) {
  const allowed = mimeType.startsWith("image/") || mimeType === "application/pdf" || mimeType.startsWith("text/");
  if (!allowed) throw new TRPCError({ code: "BAD_REQUEST", message: "نوع الملف غير مدعوم." });
}

async function storeAttachment(messageId: number, input: z.infer<typeof attachmentSchema>) {
  assertAttachmentType(input.mimeType);
  const bytes = Buffer.from(input.base64, "base64");
  if (bytes.byteLength === 0 || bytes.byteLength > 5 * 1024 * 1024) throw new TRPCError({ code: "BAD_REQUEST", message: "حجم الملف يجب ألا يتجاوز 5 ميغابايت." });
  const safeName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const stored = await storagePut(`support-attachments/${messageId}/${safeName}`, bytes, input.mimeType);
  return db.createMessageAttachment({ messageId, storageKey: stored.key, url: stored.url, fileName: input.fileName, mimeType: input.mimeType, sizeBytes: bytes.byteLength });
}

async function storeGuestAvatar(contactId: number, input: { avatarFileName?: string; avatarMimeType?: string; avatarBase64?: string }) {
  if (!input.avatarBase64) return;
  if (!input.avatarMimeType?.startsWith("image/")) throw new TRPCError({ code: "BAD_REQUEST", message: "يجب أن تكون صورة العميل ملف صورة صالحاً." });
  const bytes = Buffer.from(input.avatarBase64, "base64");
  if (!bytes.byteLength || bytes.byteLength > 2 * 1024 * 1024) throw new TRPCError({ code: "BAD_REQUEST", message: "صورة العميل يجب ألا تتجاوز 2 ميغابايت." });
  const safeName = (input.avatarFileName || "avatar.png").replace(/[^a-zA-Z0-9._-]/g, "_");
  const stored = await storagePut(`customer-avatars/${contactId}/${safeName}`, bytes, input.avatarMimeType);
  await db.updateContact(contactId, { avatarUrl: stored.url });
}

const ownerNotice = async (title: string, content: string) => {
  try {
    await notifyOwner({ title, content });
  } catch (error) {
    console.warn("[Support] Owner notification did not send", error);
  }
};

export const supportRouter = router({
  create: publicProcedure
    .input(
      z.object({
        guestName: z.string().trim().min(2, "يرجى كتابة الاسم.").max(120),
        issue: supportMessageSchema,
        inviteCode: z.string().trim().min(8).max(24),
      }).merge(guestProfileSchema),
    )
    .mutation(async ({ input }) => {
      const result = await db.validateInvitation(input.inviteCode);
      if (!result.invitation || result.reason) throw new TRPCError({ code: "NOT_FOUND", message: "رابط الدعوة غير صالح أو انتهت صلاحيته." });
      const consumed = await db.consumeInvitation(result.invitation.id);
      if (!consumed) throw new TRPCError({ code: "NOT_FOUND", message: "تعذّر استخدام رابط الدعوة." });
      const invitationId = result.invitation.id;
      const conversation = await db.createSupportConversation({
        publicId: nanoid(14),
        accessToken: nanoid(40),
        guestName: input.guestName,
        issue: input.issue,
        invitationId,
        email: input.email || undefined,
        phone: input.phone || undefined,
        extraData: input.extraData || undefined,
      });

      if (!conversation) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "تعذّر إنشاء المحادثة." });
      if (conversation.contactId) await storeGuestAvatar(conversation.contactId, input);
      await ownerNotice("محادثة دعم جديدة", `بدأ ${conversation.guestName} محادثة جديدة: ${conversation.issue.slice(0, 180)}`);
      return { publicId: conversation.publicId, accessToken: conversation.accessToken };
    }),

  guestConversation: publicProcedure.input(guestAccessSchema).query(async ({ input }) => {
    const conversation = await db.getGuestConversation(input.publicId, input.accessToken);
    if (!conversation) throw new TRPCError({ code: "NOT_FOUND", message: "لم يتم العثور على هذه المحادثة." });
    const messages = await db.listSupportMessages(conversation.id);
    const attachments = await db.listMessageAttachments(messages.map(message => message.id));
    return { conversation, messages, attachments };
  }),

  guestSend: publicProcedure
    .input(guestAccessSchema.extend({ content: supportMessageSchema }))
    .mutation(async ({ input }) => {
      const result = await db.addGuestMessage(input);
      if (result.reason === "not_found") throw new TRPCError({ code: "NOT_FOUND", message: "لم يتم العثور على هذه المحادثة." });
      if (result.reason === "closed") throw new TRPCError({ code: "FORBIDDEN", message: "هذه المحادثة مغلقة. ابدأ محادثة جديدة إذا احتجت إلى مساعدة." });
      if (!result.conversation || !result.message) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "تعذّر إرسال الرسالة." });
      emitRealtimeMessage(result.conversation.id, { messageId: result.message.id, sender: "guest" });
      await ownerNotice("رسالة دعم جديدة", `${result.conversation.guestName}: ${result.message.content.slice(0, 180)}`);
      return result.message;
    }),

  guestSendAttachment: publicProcedure
    .input(guestAccessSchema.merge(attachmentSchema))
    .mutation(async ({ input }) => {
      const result = await db.addGuestMessage({ publicId: input.publicId, accessToken: input.accessToken, content: input.caption || `أرسل ملفاً: ${input.fileName}` });
      if (result.reason === "not_found") throw new TRPCError({ code: "NOT_FOUND", message: "لم يتم العثور على هذه المحادثة." });
      if (result.reason === "closed") throw new TRPCError({ code: "FORBIDDEN", message: "هذه المحادثة مغلقة." });
      if (!result.conversation || !result.message) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "تعذّر إنشاء رسالة الملف." });
      const attachment = await storeAttachment(result.message.id, input);
      emitRealtimeMessage(result.conversation.id, { messageId: result.message.id, sender: "guest" });
      await ownerNotice("ملف جديد من عميل", `${result.conversation.guestName}: ${input.fileName}`);
      return { message: result.message, attachment };
    }),

  list: adminProcedure
    .input(
      z.object({
        search: z.string().max(120).optional(),
        status: z.union([supportStatusSchema, z.literal("all")]).optional(),
        archived: z.boolean().optional(),
      }),
    )
    .query(({ input }) => db.listSupportConversations(input)),

  stats: adminProcedure.query(() => db.getSupportStats()),

  ownerConversation: adminProcedure
    .input(z.object({ conversationId: z.number().int().positive() }))
    .query(async ({ input }) => {
      const conversation = await db.getSupportConversationById(input.conversationId);
      if (!conversation) throw new TRPCError({ code: "NOT_FOUND", message: "المحادثة غير موجودة." });
      if (conversation.ownerUnread) await db.updateSupportConversation(conversation.id, { ownerUnread: false });
      const messages = await db.listSupportMessages(conversation.id);
      const attachments = await db.listMessageAttachments(messages.map(message => message.id));
      return { conversation: { ...conversation, ownerUnread: false }, messages, attachments };
    }),

  ownerSend: adminProcedure
    .input(z.object({ conversationId: z.number().int().positive(), content: supportMessageSchema }))
    .mutation(async ({ input }) => {
      const conversation = await db.getSupportConversationById(input.conversationId);
      if (!conversation) throw new TRPCError({ code: "NOT_FOUND", message: "المحادثة غير موجودة." });
      if (!canReplyToConversation(conversation.status)) throw new TRPCError({ code: "FORBIDDEN", message: "لا يمكن إرسال رد في محادثة مغلقة." });
      const message = await db.addOwnerMessage(input.conversationId, input.content);
      if (message) emitRealtimeMessage(input.conversationId, { messageId: message.id, sender: "owner" });
      return message;
    }),

  ownerSendAttachment: adminProcedure
    .input(z.object({ conversationId: z.number().int().positive() }).merge(attachmentSchema))
    .mutation(async ({ input }) => {
      const conversation = await db.getSupportConversationById(input.conversationId);
      if (!conversation) throw new TRPCError({ code: "NOT_FOUND", message: "المحادثة غير موجودة." });
      if (!canReplyToConversation(conversation.status)) throw new TRPCError({ code: "FORBIDDEN", message: "لا يمكن إرسال ملف في محادثة مغلقة." });
      const message = await db.addOwnerMessage(input.conversationId, input.caption || `أرسل الفريق ملفاً: ${input.fileName}`);
      if (!message) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "تعذّر إنشاء رسالة الملف." });
      const attachment = await storeAttachment(message.id, input);
      emitRealtimeMessage(input.conversationId, { messageId: message.id, sender: "owner" });
      return { message, attachment };
    }),

  update: adminProcedure
    .input(
      z.object({
        conversationId: z.number().int().positive(),
        status: supportStatusSchema.optional(),
        archived: z.boolean().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const { conversationId, ...changes } = input;
      const conversation = await db.updateSupportConversation(conversationId, changes);
      if (!conversation) throw new TRPCError({ code: "NOT_FOUND", message: "المحادثة غير موجودة." });
      return conversation;
    }),
});

export const supportStatusLabels = {
  open: "مفتوحة",
  in_progress: "قيد المعالجة",
  closed: "مغلقة",
} as const;
