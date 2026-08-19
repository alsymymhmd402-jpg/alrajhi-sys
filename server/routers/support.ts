import { TRPCError } from "@trpc/server";
import { nanoid } from "nanoid";
import { z } from "zod";
import * as db from "../db";
import { notifyOwner } from "../_core/notification";
import { adminProcedure, publicProcedure, router } from "../_core/trpc";

export const supportStatusSchema = z.enum(["open", "in_progress", "closed"]);
const guestAccessSchema = z.object({
  publicId: z.string().min(8).max(24),
  accessToken: z.string().min(16).max(64),
});
export const supportMessageSchema = z.string().trim().min(1, "لا يمكن إرسال رسالة فارغة.").max(4000, "الرسالة طويلة جداً.");
export const canReplyToConversation = (status: z.infer<typeof supportStatusSchema>) => status !== "closed";

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
        inviteCode: z.string().trim().min(8).max(24).optional(),
      }),
    )
    .mutation(async ({ input }) => {
      let invitationId: number | undefined;
      if (input.inviteCode) {
        const result = await db.validateInvitation(input.inviteCode);
        if (!result.invitation || result.reason) throw new TRPCError({ code: "NOT_FOUND", message: "رابط الدعوة غير صالح أو انتهت صلاحيته." });
        const consumed = await db.consumeInvitation(result.invitation.id);
        if (!consumed) throw new TRPCError({ code: "NOT_FOUND", message: "تعذّر استخدام رابط الدعوة." });
        invitationId = result.invitation.id;
      }
      const conversation = await db.createSupportConversation({
        publicId: nanoid(14),
        accessToken: nanoid(40),
        guestName: input.guestName,
        issue: input.issue,
        invitationId,
      });

      if (!conversation) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "تعذّر إنشاء المحادثة." });
      await ownerNotice("محادثة دعم جديدة", `بدأ ${conversation.guestName} محادثة جديدة: ${conversation.issue.slice(0, 180)}`);
      return { publicId: conversation.publicId, accessToken: conversation.accessToken };
    }),

  guestConversation: publicProcedure.input(guestAccessSchema).query(async ({ input }) => {
    const conversation = await db.getGuestConversation(input.publicId, input.accessToken);
    if (!conversation) throw new TRPCError({ code: "NOT_FOUND", message: "لم يتم العثور على هذه المحادثة." });
    const messages = await db.listSupportMessages(conversation.id);
    return { conversation, messages };
  }),

  guestSend: publicProcedure
    .input(guestAccessSchema.extend({ content: supportMessageSchema }))
    .mutation(async ({ input }) => {
      const result = await db.addGuestMessage(input);
      if (result.reason === "not_found") throw new TRPCError({ code: "NOT_FOUND", message: "لم يتم العثور على هذه المحادثة." });
      if (result.reason === "closed") throw new TRPCError({ code: "FORBIDDEN", message: "هذه المحادثة مغلقة. ابدأ محادثة جديدة إذا احتجت إلى مساعدة." });
      if (!result.conversation || !result.message) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "تعذّر إرسال الرسالة." });
      await ownerNotice("رسالة دعم جديدة", `${result.conversation.guestName}: ${result.message.content.slice(0, 180)}`);
      return result.message;
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
      return { conversation: { ...conversation, ownerUnread: false }, messages };
    }),

  ownerSend: adminProcedure
    .input(z.object({ conversationId: z.number().int().positive(), content: supportMessageSchema }))
    .mutation(async ({ input }) => {
      const conversation = await db.getSupportConversationById(input.conversationId);
      if (!conversation) throw new TRPCError({ code: "NOT_FOUND", message: "المحادثة غير موجودة." });
      if (!canReplyToConversation(conversation.status)) throw new TRPCError({ code: "FORBIDDEN", message: "لا يمكن إرسال رد في محادثة مغلقة." });
      return db.addOwnerMessage(input.conversationId, input.content);
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
