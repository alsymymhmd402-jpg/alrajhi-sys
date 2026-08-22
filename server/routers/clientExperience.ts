import { TRPCError } from "@trpc/server";
import { z } from "zod";
import * as db from "../db";
import { publicProcedure, router } from "../_core/trpc";
import { storagePut } from "../storage";

const colorSchema = z.string().regex(/^#[0-9a-fA-F]{6}$/, "اختر لوناً بصيغة صحيحة.");
const guestAccessSchema = z.object({ publicId: z.string().min(8).max(24), accessToken: z.string().min(16).max(64) });
const experienceSchema = z.object({
  contactId: z.number().int().positive(),
  headline: z.string().trim().min(2).max(180),
  bodyText: z.string().trim().max(2400).nullable().optional(),
  imageUrl: z.string().url().max(900).nullable().optional(),
  imagePosition: z.enum(["top", "inline", "bottom"]),
  imageScale: z.number().int().min(60).max(160),
  accentColor: colorSchema,
  textColor: colorSchema,
  displaySection: z.enum(["support", "institution", "profile", "application"]),
  buttonLabel: z.string().trim().min(2).max(80),
  buttonEnabled: z.boolean(),
  buttonSection: z.enum(["support", "institution", "profile", "application"]),
  acceptanceStatus: z.enum(["under_review", "accepted", "needs_action", "not_accepted"]),
  acceptanceTitle: z.string().trim().min(2).max(160),
  acceptanceNote: z.string().trim().max(1600).nullable().optional(),
  notifyClient: z.boolean(),
  imageBase64: z.string().max(4_000_000).optional(),
  imageFileName: z.string().trim().max(260).optional(),
  imageMimeType: z.string().trim().max(140).optional(),
});

async function storeExperienceImage(contactId: number, input: z.infer<typeof experienceSchema>) {
  if (!input.imageBase64) return input.imageUrl ?? null;
  if (!input.imageMimeType?.startsWith("image/")) throw new TRPCError({ code: "BAD_REQUEST", message: "الصورة المرفوعة غير صالحة." });
  const bytes = Buffer.from(input.imageBase64, "base64");
  if (!bytes.byteLength || bytes.byteLength > 2 * 1024 * 1024) throw new TRPCError({ code: "BAD_REQUEST", message: "حجم صورة الواجهة يجب ألا يتجاوز 2 ميغابايت." });
  const safeName = (input.imageFileName || "experience-image.png").replace(/[^a-zA-Z0-9._-]/g, "_");
  const stored = await storagePut(`client-experiences/${contactId}/${Date.now()}-${safeName}`, bytes, input.imageMimeType);
  return stored.url;
}

export const clientExperienceRouter = router({
  ownerGet: publicProcedure.input(z.object({ contactId: z.number().int().positive() })).query(async ({ input }) => {
    const details = await db.getContactDetails(input.contactId);
    if (!details) throw new TRPCError({ code: "NOT_FOUND", message: "العميل غير موجود." });
    return db.getClientExperience(input.contactId);
  }),
  ownerSave: publicProcedure.input(experienceSchema).mutation(async ({ input }) => {
    const details = await db.getContactDetails(input.contactId);
    if (!details) throw new TRPCError({ code: "NOT_FOUND", message: "العميل غير موجود." });
    const imageUrl = await storeExperienceImage(input.contactId, input);
    const { imageBase64, imageFileName, imageMimeType, imageUrl: _ignoredImageUrl, ...settings } = input;
    return db.saveClientExperience({ ...settings, imageUrl });
  }),
  guestGet: publicProcedure.input(guestAccessSchema).query(async ({ input }) => {
    const experience = await db.getGuestClientExperience(input.publicId, input.accessToken);
    if (!experience) throw new TRPCError({ code: "NOT_FOUND", message: "لم يتم العثور على تجربة العميل." });
    return experience;
  }),
});
