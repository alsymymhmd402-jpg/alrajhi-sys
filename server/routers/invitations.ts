import { TRPCError } from "@trpc/server";
import { nanoid } from "nanoid";
import { z } from "zod";
import * as db from "../db";
import { publicProcedure, router } from "../_core/trpc";

const invitationTypeSchema = z.enum(["reusable", "one_time"]);
const invitationStatusSchema = z.enum(["active", "used", "revoked", "expired"]);
const invitationCodeSchema = z.string().trim().min(8).max(24);

export const canUseInvitation = (status: z.infer<typeof invitationStatusSchema>, expiresAt: Date | null, now = Date.now()) =>
  status === "active" && (!expiresAt || expiresAt.getTime() > now);

export const invitationsRouter = router({
  preview: publicProcedure.input(z.object({ code: invitationCodeSchema })).query(async ({ input }) => {
    const result = await db.validateInvitation(input.code);
    if (!result.invitation || result.reason) throw new TRPCError({ code: "NOT_FOUND", message: "رابط الدعوة غير صالح أو انتهت صلاحيته." });
    if (!canUseInvitation(result.invitation.status, result.invitation.expiresAt)) throw new TRPCError({ code: "NOT_FOUND", message: "رابط الدعوة غير صالح أو انتهت صلاحيته." });
    return { label: result.invitation.label, type: result.invitation.type, expiresAt: result.invitation.expiresAt, voiceModelId: result.invitation.voiceModelId };
  }),

  list: publicProcedure.query(() => db.listInvitations()),

  create: publicProcedure
    .input(
      z.object({
        label: z.string().trim().min(2, "اكتب اسماً للدعوة.").max(120),
        type: invitationTypeSchema,
        voiceModelId: z.number().int().positive().nullable().optional(),
        expiresAt: z.date().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      if (input.voiceModelId) {
        const model = await db.getVoiceModel(input.voiceModelId);
        if (!model || model.status !== "active") throw new TRPCError({ code: "NOT_FOUND", message: "الصوت المختار غير متاح للدعوة." });
      }
      const invitation = await db.createInvitation({ ...input, code: nanoid(14) });
      return invitation;
    }),

  update: publicProcedure
    .input(z.object({ id: z.number().int().positive(), label: z.string().trim().min(2).max(120).optional(), status: invitationStatusSchema.optional(), expiresAt: z.date().nullable().optional(), voiceModelId: z.number().int().positive().nullable().optional() }))
    .mutation(async ({ input }) => {
      const { id, ...changes } = input;
      const invitation = await db.updateInvitation(id, changes);
      if (!invitation) throw new TRPCError({ code: "NOT_FOUND", message: "رابط الدعوة غير موجود." });
      return invitation;
    }),

  remove: publicProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ input }) => {
    await db.deleteInvitation(input.id);
    return { success: true } as const;
  }),
});
