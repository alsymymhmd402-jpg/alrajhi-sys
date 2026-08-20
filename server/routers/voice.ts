import { TRPCError } from "@trpc/server";
import { z } from "zod";
import * as db from "../db";
import { convertVoiceChunk, listElevenLabsVoices, synthesizeVoicePreview } from "../elevenlabs";
import { publicProcedure, router } from "../_core/trpc";

const modelStatusSchema = z.enum(["active", "disabled"]);

export const voiceRouter = router({
  status: publicProcedure.query(async () => ({
    provider: process.env.ELEVENLABS_API_KEY?.startsWith("sk_") ? "ElevenLabs" : "NOT CONFIGURED",
    configured: Boolean(process.env.ELEVENLABS_API_KEY?.startsWith("sk_")),
    webRtc: "جاهز لبنية الاتصال المباشر",
    turn: Boolean(process.env.TURN_SERVER_URLS) ? "مهيأ" : "NOT CONFIGURED",
    models: (await db.listVoiceModels()).length,
  })),
  listModels: publicProcedure.query(() => db.listVoiceModels()),
  catalog: publicProcedure.query(() => listElevenLabsVoices()),
  activeModel: publicProcedure.query(async () => {
    const value = await db.getSafeSetting("voice_active_model_id");
    const id = Number(value?.settingValue);
    if (!Number.isInteger(id) || id <= 0) return null;
    const model = await db.getVoiceModel(id);
    return model?.status === "active" ? model : null;
  }),
  createModel: publicProcedure.input(z.object({ name: z.string().trim().min(2).max(140), provider: z.string().trim().min(2).max(120), voiceId: z.string().trim().min(2).max(180) })).mutation(({ input }) => db.createVoiceModel(input)),
  importElevenLabsVoice: publicProcedure.input(z.object({ voiceId: z.string().trim().min(2).max(180) })).mutation(async ({ input }) => {
    const existing = await db.getVoiceModelByProviderId("ElevenLabs", input.voiceId);
    if (existing) return existing;
    const voice = (await listElevenLabsVoices()).find(item => item.voiceId === input.voiceId);
    if (!voice) throw new TRPCError({ code: "NOT_FOUND", message: "لم يُعثر على الصوت داخل مكتبة ElevenLabs الخاصة بك." });
    return db.createVoiceModel({ name: voice.name, provider: "ElevenLabs", voiceId: voice.voiceId });
  }),
  updateModel: publicProcedure.input(z.object({ id: z.number().int().positive(), name: z.string().trim().min(2).max(140).optional(), provider: z.string().trim().min(2).max(120).optional(), voiceId: z.string().trim().min(2).max(180).optional(), status: modelStatusSchema.optional() })).mutation(async ({ input }) => {
    const { id, ...changes } = input;
    const model = await db.updateVoiceModel(id, changes);
    if (!model) throw new TRPCError({ code: "NOT_FOUND", message: "النموذج الصوتي غير موجود." });
    return model;
  }),
  setActiveModel: publicProcedure.input(z.object({ modelId: z.number().int().positive().nullable() })).mutation(async ({ input }) => {
    if (input.modelId) {
      const model = await db.getVoiceModel(input.modelId);
      if (!model || model.status !== "active") throw new TRPCError({ code: "NOT_FOUND", message: "اختر صوتاً نشطاً من مكتبتك أولاً." });
    }
    await db.setSafeSetting("voice_active_model_id", input.modelId ? String(input.modelId) : "", null);
    return { success: true } as const;
  }),
  preview: publicProcedure.input(z.object({ modelId: z.number().int().positive() })).mutation(async ({ input }) => {
    const model = await db.getVoiceModel(input.modelId);
    if (!model || model.status !== "active") throw new TRPCError({ code: "NOT_FOUND", message: "الصوت غير متاح للمعاينة." });
    return { audioBase64: await synthesizeVoicePreview(model.voiceId), mimeType: "audio/mpeg" };
  }),
  convertChunk: publicProcedure.input(z.object({ modelId: z.number().int().positive(), audioBase64: z.string().min(32).max(2_800_000), mimeType: z.string().min(3).max(100) })).mutation(async ({ input }) => {
    const model = await db.getVoiceModel(input.modelId);
    if (!model || model.status !== "active") throw new TRPCError({ code: "NOT_FOUND", message: "الصوت المختار غير متاح." });
    const audio = Buffer.from(input.audioBase64, "base64");
    if (!audio.length || audio.length > 2_000_000) throw new TRPCError({ code: "PAYLOAD_TOO_LARGE", message: "مقطع الصوت كبير جداً للتحويل الحي." });
    return { audioBase64: await convertVoiceChunk({ voiceId: model.voiceId, audio, mimeType: input.mimeType }), mimeType: "audio/mpeg" };
  }),
  removeModel: publicProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ input }) => { await db.deleteVoiceModel(input.id); return { success: true } as const; }),
});
