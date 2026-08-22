import { nanoid } from "nanoid";
import { z } from "zod";
import * as db from "../db";
import { publicProcedure, router } from "../_core/trpc";
import { appendStatusMediaChunk, beginStatusMediaUpload, finishStatusMediaUpload } from "../statusMediaUpload";

const guestAccessSchema = z.object({
  publicId: z.string().min(8).max(24),
  accessToken: z.string().min(16).max(64),
});

const statusStyleSchema = z.object({
  textContent: z.string().trim().max(500).optional().nullable(),
  textColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  textFont: z.enum(["modern", "classic", "handwritten", "bold"]).optional(),
  textAlign: z.enum(["right", "center", "left"]).optional(),
  textPositionX: z.number().int().min(5).max(95).optional(),
  textPositionY: z.number().int().min(8).max(92).optional(),
  mediaFilter: z.enum(["none", "warm", "cool", "mono", "vivid", "fade"]).optional(),
});

const uploadSchema = statusStyleSchema.extend({
  fileName: z.string().trim().min(1).max(260),
  mimeType: z.string().trim().min(3).max(140),
  storageKey: z.string().trim().regex(/^institution-statuses\/[a-zA-Z0-9._-]+$/).max(700),
  mediaUrl: z.string().trim().regex(/^\/manus-storage\/institution-statuses\/[a-zA-Z0-9._-]+$/).max(900),
});
const uploadStartSchema = z.object({ fileName: z.string().trim().min(1).max(260), mimeType: z.string().trim().min(3).max(140), size: z.number().int().positive().max(14 * 1024 * 1024), totalChunks: z.number().int().min(1).max(800) });
const uploadChunkSchema = z.object({ uploadId: z.string().min(12).max(40), index: z.number().int().min(0).max(799), data: z.string().min(1).max(30_000).regex(/^[A-Za-z0-9_-]+$/) });

function getMediaType(mimeType: string) {
  if (mimeType.startsWith("image/")) return "image" as const;
  if (["video/mp4", "video/webm", "video/quicktime"].includes(mimeType)) return "video" as const;
  throw new Error("يمكن رفع صورة أو فيديو MP4 أو WebM أو MOV فقط.");
}

function getExtension(fileName: string, mimeType: string) {
  const existing = fileName.split(".").pop()?.replace(/[^a-zA-Z0-9]/g, "");
  if (existing && existing.length <= 8) return existing.toLowerCase();
  return mimeType === "video/mp4" ? "mp4" : mimeType === "video/webm" ? "webm" : "jpg";
}

export const institutionStatusesRouter = router({
  beginUpload: publicProcedure.input(uploadStartSchema).mutation(({ input }) => beginStatusMediaUpload(input)),
  uploadChunk: publicProcedure.input(uploadChunkSchema).mutation(({ input }) => appendStatusMediaChunk(input)),
  completeUpload: publicProcedure.input(z.object({ uploadId: z.string().min(12).max(40) })).mutation(({ input }) => finishStatusMediaUpload(input.uploadId)),
  ownerList: publicProcedure.query(() => db.listInstitutionStatuses()),

  create: publicProcedure.input(uploadSchema).mutation(async ({ input }) => {
    const mediaType = getMediaType(input.mimeType);
    return db.createInstitutionStatus({
      mediaType,
      storageKey: input.storageKey,
      mediaUrl: input.mediaUrl,
      fileName: input.fileName,
      mimeType: input.mimeType,
      textContent: input.textContent || null,
      textColor: input.textColor,
      textFont: input.textFont,
      textAlign: input.textAlign,
      textPositionX: input.textPositionX,
      textPositionY: input.textPositionY,
      mediaFilter: input.mediaFilter,
    });
  }),

  update: publicProcedure.input(z.object({ id: z.number().int().positive() }).merge(statusStyleSchema)).mutation(async ({ input }) => {
    const { id, ...style } = input;
    const status = await db.updateInstitutionStatus(id, style);
    if (!status) throw new Error("تعذّر العثور على الحالة.");
    return status;
  }),

  publish: publicProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ input }) => {
    const status = await db.updateInstitutionStatus(input.id, { isPublished: true, expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) });
    if (!status) throw new Error("تعذّر العثور على الحالة.");
    return status;
  }),

  unpublish: publicProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ input }) => {
    const status = await db.updateInstitutionStatus(input.id, { isPublished: false, expiresAt: null });
    if (!status) throw new Error("تعذّر العثور على الحالة.");
    return status;
  }),

  remove: publicProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ input }) => {
    await db.removeInstitutionStatus(input.id);
    return { success: true };
  }),

  guestList: publicProcedure.input(guestAccessSchema).query(async ({ input }) => {
    const conversation = await db.getGuestConversation(input.publicId, input.accessToken);
    if (!conversation) throw new Error("لم يتم العثور على جلسة العميل.");
    return db.listPublishedInstitutionStatuses();
  }),

  markViewed: publicProcedure.input(guestAccessSchema.extend({ statusId: z.number().int().positive() })).mutation(async ({ input }) => {
    const conversation = await db.getGuestConversation(input.publicId, input.accessToken);
    if (!conversation?.contactId) throw new Error("لم يتم العثور على جلسة العميل.");
    const active = await db.listPublishedInstitutionStatuses();
    if (!active.some(status => status.id === input.statusId)) throw new Error("هذه الحالة لم تعد متاحة.");
    await db.markInstitutionStatusViewed(input.statusId, conversation.contactId);
    return { success: true };
  }),
});
