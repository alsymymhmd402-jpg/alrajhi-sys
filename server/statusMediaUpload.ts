import { nanoid } from "nanoid";
import { storagePut } from "./storage";

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_VIDEO_BYTES = 14 * 1024 * 1024;
const MAX_CHUNK_CHARS = 30_000;
const SESSION_TTL_MS = 15 * 60 * 1000;
const sessions = new Map<string, { fileName: string; mimeType: string; expectedBytes: number; totalChunks: number; chunks: string[]; createdAt: number }>();

function mediaTypeFor(mimeType: string) {
  if (mimeType.startsWith("image/")) return "image" as const;
  if (["video/mp4", "video/webm", "video/quicktime"].includes(mimeType)) return "video" as const;
  throw new Error("ارفع صورة أو فيديو MP4 أو WebM أو MOV.");
}

function cleanExpired() {
  const cutoff = Date.now() - SESSION_TTL_MS;
  sessions.forEach((session, id) => { if (session.createdAt < cutoff) sessions.delete(id); });
}

export function beginStatusMediaUpload(input: { fileName: string; mimeType: string; size: number; totalChunks: number }) {
  cleanExpired();
  const mediaType = mediaTypeFor(input.mimeType);
  const limit = mediaType === "video" ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
  if (!Number.isInteger(input.size) || input.size < 1 || input.size > limit) throw new Error(mediaType === "video" ? "حجم الفيديو يجب ألا يتجاوز 14 ميغابايت." : "حجم الصورة يجب ألا يتجاوز 8 ميغابايت.");
  if (!Number.isInteger(input.totalChunks) || input.totalChunks < 1 || input.totalChunks > 800) throw new Error("عدد أجزاء الوسيط غير صالح.");
  if (sessions.size >= 12) throw new Error("توجد عمليات رفع كثيرة حالياً، حاول بعد دقيقة.");
  const uploadId = nanoid(18);
  sessions.set(uploadId, { fileName: input.fileName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 260), mimeType: input.mimeType, expectedBytes: input.size, totalChunks: input.totalChunks, chunks: Array(input.totalChunks).fill(""), createdAt: Date.now() });
  return { uploadId, mediaType };
}

export function appendStatusMediaChunk(input: { uploadId: string; index: number; data: string }) {
  const session = sessions.get(input.uploadId);
  if (!session || session.createdAt < Date.now() - SESSION_TTL_MS) throw new Error("انتهت جلسة الرفع، أعد اختيار الملف.");
  if (!Number.isInteger(input.index) || input.index < 0 || input.index >= session.totalChunks || !/^[A-Za-z0-9_-]+$/.test(input.data) || input.data.length > MAX_CHUNK_CHARS) throw new Error("جزء الوسيط غير صالح.");
  session.chunks[input.index] = input.data;
  return { received: input.index + 1, total: session.totalChunks };
}

export async function finishStatusMediaUpload(uploadId: string) {
  const session = sessions.get(uploadId);
  if (!session) throw new Error("انتهت جلسة الرفع، أعد اختيار الملف.");
  try {
    if (session.chunks.some(chunk => !chunk)) throw new Error("لم تكتمل أجزاء الوسيط.");
    const encoded = session.chunks.map(chunk => chunk.split("").reverse().join("")).join("");
    const buffer = Buffer.from(encoded, "base64url");
    if (buffer.byteLength !== session.expectedBytes) throw new Error("تعذر التحقق من حجم الوسيط.");
    const extension = session.fileName.split(".").pop()?.slice(0, 8) || (session.mimeType === "video/mp4" ? "mp4" : session.mimeType === "video/webm" ? "webm" : "jpg");
    return storagePut(`institution-statuses/${Date.now()}-${nanoid(10)}.${extension}`, buffer, session.mimeType);
  } finally {
    sessions.delete(uploadId);
  }
}
