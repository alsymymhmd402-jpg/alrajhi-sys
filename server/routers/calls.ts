import { TRPCError } from "@trpc/server";
import { z } from "zod";
import * as db from "../db";
import { issueOwnerRealtimeToken } from "../realtime";
import { adminProcedure, publicProcedure, router } from "../_core/trpc";

const guestAccessSchema = z.object({
  publicId: z.string().min(8).max(24),
  accessToken: z.string().min(16).max(64),
});

export const canStartDirectCall = (status: "open" | "in_progress" | "closed") => status !== "closed";

function getIceServers() {
  const servers: Array<{ urls: string | string[]; username?: string; credential?: string }> = [
    { urls: "stun:stun.l.google.com:19302" },
  ];
  const rawUrls = process.env.TURN_SERVER_URLS;
  const username = process.env.TURN_SERVER_USERNAME;
  const credential = process.env.TURN_SERVER_CREDENTIAL;
  if (rawUrls && username && credential) {
    try {
      const urls = JSON.parse(rawUrls);
      if (Array.isArray(urls) && urls.every(value => typeof value === "string")) {
        servers.push({ urls, username, credential });
      }
    } catch {
      console.warn("[Calls] TURN_SERVER_URLS must be a JSON string array.");
    }
  }
  return servers;
}

export const callsRouter = router({
  ownerIceConfig: adminProcedure.query(() => ({ iceServers: getIceServers(), turnConfigured: Boolean(process.env.TURN_SERVER_URLS) })),

  iceConfig: publicProcedure.input(guestAccessSchema).query(async ({ input }) => {
    const conversation = await db.getGuestConversation(input.publicId, input.accessToken);
    if (!conversation) throw new TRPCError({ code: "NOT_FOUND", message: "لم يتم العثور على جلسة المحادثة." });
    return { iceServers: getIceServers(), turnConfigured: Boolean(process.env.TURN_SERVER_URLS) };
  }),

  createDirect: publicProcedure.input(guestAccessSchema).mutation(async ({ input }) => {
    const conversation = await db.getGuestConversation(input.publicId, input.accessToken);
    if (!conversation) throw new TRPCError({ code: "NOT_FOUND", message: "لم يتم العثور على جلسة المحادثة." });
    if (!canStartDirectCall(conversation.status)) throw new TRPCError({ code: "FORBIDDEN", message: "لا يمكن بدء مكالمة من محادثة مغلقة." });
    return db.createCallLog({ conversationId: conversation.id, invitationId: conversation.invitationId ?? undefined, mode: "direct" });
  }),

  createOwnerDirect: adminProcedure.input(z.object({ conversationId: z.number().int().positive() })).mutation(async ({ input }) => {
    const conversation = await db.getSupportConversationById(input.conversationId);
    if (!conversation) throw new TRPCError({ code: "NOT_FOUND", message: "المحادثة غير موجودة." });
    if (!canStartDirectCall(conversation.status)) throw new TRPCError({ code: "FORBIDDEN", message: "لا يمكن بدء مكالمة من محادثة مغلقة." });
    return db.createCallLog({ conversationId: conversation.id, invitationId: conversation.invitationId ?? undefined, mode: "direct" });
  }),

  ownerRealtimeToken: adminProcedure.mutation(({ ctx }) => ({ token: issueOwnerRealtimeToken(ctx.user.id) })),

  list: adminProcedure.query(() => db.listCallLogs()),
});
