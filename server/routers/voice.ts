import { TRPCError } from "@trpc/server";
import { z } from "zod";
import * as db from "../db";
import { publicProcedure, router } from "../_core/trpc";

const modelStatusSchema = z.enum(["active", "disabled"]);

export const voiceRouter = router({
  status: publicProcedure.query(async () => ({
    provider: "NOT CONFIGURED",
    configured: false,
    webRtc: "جاهز لبنية الاتصال المباشر",
    turn: Boolean(process.env.TURN_SERVER_URLS) ? "مهيأ" : "NOT CONFIGURED",
    models: (await db.listVoiceModels()).length,
  })),
  listModels: publicProcedure.query(() => db.listVoiceModels()),
  createModel: publicProcedure.input(z.object({ name: z.string().trim().min(2).max(140), provider: z.string().trim().min(2).max(120), voiceId: z.string().trim().min(2).max(180) })).mutation(({ input }) => db.createVoiceModel(input)),
  updateModel: publicProcedure.input(z.object({ id: z.number().int().positive(), name: z.string().trim().min(2).max(140).optional(), provider: z.string().trim().min(2).max(120).optional(), voiceId: z.string().trim().min(2).max(180).optional(), status: modelStatusSchema.optional() })).mutation(async ({ input }) => {
    const { id, ...changes } = input;
    const model = await db.updateVoiceModel(id, changes);
    if (!model) throw new TRPCError({ code: "NOT_FOUND", message: "النموذج الصوتي غير موجود." });
    return model;
  }),
  removeModel: publicProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ input }) => { await db.deleteVoiceModel(input.id); return { success: true } as const; }),
});
