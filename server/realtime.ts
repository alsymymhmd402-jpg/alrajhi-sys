import { Server as HttpServer } from "http";
import { nanoid } from "nanoid";
import { Server, Socket } from "socket.io";
import * as db from "./db";

type OwnerToken = { userId: number; expiresAt: number };
type RealtimeSocket = Socket & {
  data: {
    role: "guest" | "owner";
    userId?: number;
    conversationId?: number;
    guestName?: string;
    callId?: number;
  };
};
type RealtimeMessageSender = "guest" | "owner" | "ai" | "system";

const ownerTokens = new Map<string, OwnerToken>();
const guestSocketByCall = new Map<number, string>();
const guestSocketByConversation = new Map<number, string>();
const ownerSocketByCall = new Map<number, string>();
const callStartedAt = new Map<number, number>();
const ringTimers = new Map<number, ReturnType<typeof setTimeout>>();
const OWNER_LOBBY = "owner:lobby";
export const MISSED_CALL_TIMEOUT_MS = 30_000;
export const MISSED_CALL_FAILURE_REASON = "مكالمة فائتة: لم يجب الطرف الآخر خلال 30 ثانية.";
let realtimeIo: Server | null = null;

export function createMissedCallUpdate(endedAt = new Date()) {
  return { status: "failed" as const, endedAt, failureReason: MISSED_CALL_FAILURE_REASON };
}

function cleanupExpiredOwnerTokens() {
  const now = Date.now();
  for (const [token, session] of Array.from(ownerTokens.entries())) {
    if (session.expiresAt <= now) ownerTokens.delete(token);
  }
}

export function issueOwnerRealtimeToken(userId: number) {
  cleanupExpiredOwnerTokens();
  const token = nanoid(40);
  ownerTokens.set(token, { userId, expiresAt: Date.now() + 10 * 60 * 1000 });
  return token;
}

function callRoom(callId: number) {
  return `call:${callId}`;
}

function chatRoom(conversationId: number) {
  return `chat:${conversationId}`;
}

export function emitChatMessageTo(
  io: Pick<Server, "to">,
  conversationId: number,
  payload: { messageId: number; sender: RealtimeMessageSender },
) {
  io.to(chatRoom(conversationId)).emit("chat:message", payload);
}

export function emitRealtimeMessage(conversationId: number, payload: { messageId: number; sender: RealtimeMessageSender }) {
  if (realtimeIo) emitChatMessageTo(realtimeIo, conversationId, payload);
}

async function recordCallSystemMessage(io: Server, call: Awaited<ReturnType<typeof db.getCallLog>>, content: string) {
  if (!call?.conversationId) return;
  try {
    const message = await db.addSystemMessage(call.conversationId, content);
    if (message) emitChatMessageTo(io, call.conversationId, { messageId: message.id, sender: "system" });
  } catch (error) {
    console.error("[Realtime] تعذّر حفظ رسالة نظام المكالمة:", error);
  }
}

export function createEndedCallMessage(durationSeconds: number) {
  return `انتهت المكالمة · المدة ${durationSeconds} ثانية`;
}

async function verifyCallAccess(socket: RealtimeSocket, callId: number) {
  const call = await db.getCallLog(callId);
  if (!call || call.mode !== "direct") return undefined;
  if (socket.data.role === "guest" && call.conversationId !== socket.data.conversationId) return undefined;
  return call;
}

function clearRingTimer(callId: number) {
  const timer = ringTimers.get(callId);
  if (timer) clearTimeout(timer);
  ringTimers.delete(callId);
}

export function scheduleMissedCall(io: Server, callId: number) {
  clearRingTimer(callId);
  ringTimers.set(callId, setTimeout(async () => {
    const call = await db.getCallLog(callId);
    if (!call || call.status !== "ringing") return;
    const missedCallUpdate = createMissedCallUpdate();
    const reason = missedCallUpdate.failureReason;
    await db.updateCallLog(callId, missedCallUpdate);
    await recordCallSystemMessage(io, call, "مكالمة فائتة · لم يجب الطرف الآخر خلال 30 ثانية");
    const guestSocketId = guestSocketByCall.get(callId);
    const ownerSocketId = ownerSocketByCall.get(callId);
    if (guestSocketId) io.to(guestSocketId).emit("call:ended", { callId, reason });
    if (ownerSocketId) io.to(ownerSocketId).emit("call:ended", { callId, reason });
    io.to(OWNER_LOBBY).emit("call:ended", { callId, reason });
    if (!ownerSocketId) io.to(OWNER_LOBBY).emit("call:missed", { callId, reason });
    guestSocketByCall.delete(callId);
    ownerSocketByCall.delete(callId);
    clearRingTimer(callId);
  }, MISSED_CALL_TIMEOUT_MS));
}

export function registerRealtimeGateway(server: HttpServer) {
  const io = new Server(server, {
    path: "/api/realtime",
    cors: { origin: true, credentials: true },
  });
  realtimeIo = io;

  io.use(async (rawSocket, next) => {
    const socket = rawSocket as RealtimeSocket;
    const auth = socket.handshake.auth as Record<string, unknown>;
    if (auth.role === "owner" && typeof auth.token === "string") {
      cleanupExpiredOwnerTokens();
      const session = ownerTokens.get(auth.token);
      if (!session || session.expiresAt <= Date.now()) return next(new Error("جلسة فريق الدعم غير صالحة."));
      ownerTokens.delete(auth.token);
      socket.data = { role: "owner", userId: session.userId };
      return next();
    }

    if (
      auth.role === "guest" &&
      typeof auth.publicId === "string" &&
      typeof auth.accessToken === "string"
    ) {
      try {
        const conversation = await db.getGuestConversation(auth.publicId, auth.accessToken);
        if (!conversation) return next(new Error("جلسة الضيف غير صالحة."));
        socket.data = { role: "guest", conversationId: conversation.id, guestName: conversation.guestName };
        return next();
      } catch {
        return next(new Error("تعذّر التحقق من جلسة الضيف."));
      }
    }

    return next(new Error("بيانات الاتصال الحي غير صالحة."));
  });

  io.on("connection", rawSocket => {
    const socket = rawSocket as RealtimeSocket;
    if (socket.data.role === "owner") socket.join(OWNER_LOBBY);
    if (socket.data.role === "guest" && socket.data.conversationId) {
      guestSocketByConversation.set(socket.data.conversationId, socket.id);
      socket.join(chatRoom(socket.data.conversationId));
      void (async () => {
        const conversation = await db.getSupportConversationById(socket.data.conversationId!);
        if (conversation?.contactId) await db.updateContact(conversation.contactId, { connectionStatus: "online" });
      })();
    }

    socket.on("chat:join", async ({ conversationId }: { conversationId: number }) => {
      if (socket.data.role !== "owner" || !Number.isInteger(conversationId)) return;
      const conversation = await db.getSupportConversationById(conversationId);
      if (conversation) socket.join(chatRoom(conversationId));
    });

    socket.on("call:request", async ({ callId }: { callId: number }) => {
      if (socket.data.role !== "guest" || !Number.isInteger(callId)) return;
      const call = await verifyCallAccess(socket, callId);
      if (!call || call.status !== "requested") return;
      guestSocketByCall.set(callId, socket.id);
      socket.data.callId = callId;
      await db.updateCallLog(callId, { status: "ringing" });
      io.to(OWNER_LOBBY).emit("call:incoming", {
        callId,
        conversationId: socket.data.conversationId,
        guestName: socket.data.guestName,
      });
      scheduleMissedCall(io, callId);
      socket.emit("call:ringing", { callId });
    });

    socket.on("call:owner-request", async ({ callId }: { callId: number }) => {
      if (socket.data.role !== "owner" || !Number.isInteger(callId)) return;
      const call = await verifyCallAccess(socket, callId);
      if (!call || call.status !== "requested" || !call.conversationId) return;
      const guestSocketId = guestSocketByConversation.get(call.conversationId);
      if (!guestSocketId) {
        await db.updateCallLog(callId, { status: "failed", endedAt: new Date(), failureReason: "العميل غير متصل الآن." });
        await recordCallSystemMessage(io, call, "لم تتم المكالمة · العميل غير متصل الآن");
        socket.emit("call:ended", { callId, reason: "العميل غير متصل الآن." });
        return;
      }
      guestSocketByCall.set(callId, guestSocketId);
      ownerSocketByCall.set(callId, socket.id);
      socket.data.callId = callId;
      await db.updateCallLog(callId, { status: "ringing" });
      io.to(guestSocketId).emit("call:incoming", { callId });
      scheduleMissedCall(io, callId);
      socket.emit("call:ringing", { callId });
    });

    socket.on("call:accept", async ({ callId }: { callId: number }) => {
      if (socket.data.role !== "owner" || !Number.isInteger(callId)) return;
      const call = await verifyCallAccess(socket, callId);
      const guestSocketId = guestSocketByCall.get(callId);
      if (!call || !guestSocketId) return;
      const room = callRoom(callId);
      socket.join(room);
      ownerSocketByCall.set(callId, socket.id);
      const guestSocket = io.sockets.sockets.get(guestSocketId) as RealtimeSocket | undefined;
      guestSocket?.join(room);
      callStartedAt.set(callId, Date.now());
      clearRingTimer(callId);
      await db.updateCallLog(callId, { status: "connected", startedAt: new Date() });
      io.to(room).emit("call:accepted", { callId });
    });

    socket.on("call:reject", async ({ callId }: { callId: number }) => {
      if (socket.data.role !== "owner" || !Number.isInteger(callId)) return;
      const call = await verifyCallAccess(socket, callId);
      const guestSocketId = guestSocketByCall.get(callId);
      if (!call) return;
      await db.updateCallLog(callId, { status: "cancelled", endedAt: new Date() });
      await recordCallSystemMessage(io, call, "تم رفض المكالمة من فريق الدعم");
      clearRingTimer(callId);
      if (guestSocketId) io.to(guestSocketId).emit("call:ended", { callId, reason: "رفض فريق الدعم المكالمة." });
      guestSocketByCall.delete(callId);
    });

    socket.on("call:guest-accept", async ({ callId }: { callId: number }) => {
      if (socket.data.role !== "guest" || !Number.isInteger(callId)) return;
      const call = await verifyCallAccess(socket, callId);
      const ownerSocketId = ownerSocketByCall.get(callId);
      if (!call || !ownerSocketId) return;
      const room = callRoom(callId);
      socket.join(room);
      const ownerSocket = io.sockets.sockets.get(ownerSocketId) as RealtimeSocket | undefined;
      ownerSocket?.join(room);
      callStartedAt.set(callId, Date.now());
      clearRingTimer(callId);
      await db.updateCallLog(callId, { status: "connected", startedAt: new Date() });
      io.to(room).emit("call:accepted", { callId, caller: "owner" });
    });

    socket.on("call:guest-reject", async ({ callId }: { callId: number }) => {
      if (socket.data.role !== "guest" || !Number.isInteger(callId)) return;
      const call = await verifyCallAccess(socket, callId);
      const ownerSocketId = ownerSocketByCall.get(callId);
      if (!call) return;
      await db.updateCallLog(callId, { status: "cancelled", endedAt: new Date(), failureReason: "رفض العميل المكالمة." });
      await recordCallSystemMessage(io, call, "تم رفض المكالمة من العميل");
      clearRingTimer(callId);
      if (ownerSocketId) io.to(ownerSocketId).emit("call:ended", { callId, reason: "رفض العميل المكالمة." });
      guestSocketByCall.delete(callId);
      ownerSocketByCall.delete(callId);
    });

    socket.on("webrtc:offer", async ({ callId, sdp }: { callId: number; sdp: RTCSessionDescriptionInit }) => {
      if (!Number.isInteger(callId) || !(await verifyCallAccess(socket, callId))) return;
      socket.to(callRoom(callId)).emit("webrtc:offer", { callId, sdp });
    });

    socket.on("webrtc:answer", async ({ callId, sdp }: { callId: number; sdp: RTCSessionDescriptionInit }) => {
      if (!Number.isInteger(callId) || !(await verifyCallAccess(socket, callId))) return;
      socket.to(callRoom(callId)).emit("webrtc:answer", { callId, sdp });
    });

    socket.on("webrtc:ice", async ({ callId, candidate }: { callId: number; candidate: RTCIceCandidateInit }) => {
      if (!Number.isInteger(callId) || !(await verifyCallAccess(socket, callId))) return;
      socket.to(callRoom(callId)).emit("webrtc:ice", { callId, candidate });
    });

    socket.on("call:end", async ({ callId, reason }: { callId: number; reason?: string }) => {
      if (!Number.isInteger(callId)) return;
      const call = await verifyCallAccess(socket, callId);
      if (!call) return;
      const started = callStartedAt.get(callId);
      const durationSeconds = started ? Math.max(0, Math.floor((Date.now() - started) / 1000)) : 0;
      await db.updateCallLog(callId, { status: "ended", endedAt: new Date(), durationSeconds, failureReason: reason?.slice(0, 300) });
      await recordCallSystemMessage(io, call, createEndedCallMessage(durationSeconds));
      clearRingTimer(callId);
      io.to(callRoom(callId)).emit("call:ended", { callId, reason: reason ?? "انتهت المكالمة." });
      io.to(OWNER_LOBBY).emit("call:ended", { callId, reason: reason ?? "انتهت المكالمة." });
      guestSocketByCall.delete(callId);
      ownerSocketByCall.delete(callId);
      callStartedAt.delete(callId);
    });

    socket.on("disconnect", () => {
      if (socket.data.role === "guest" && socket.data.callId) {
        io.to(OWNER_LOBBY).emit("call:guest-disconnected", { callId: socket.data.callId });
      }
      if (socket.data.role === "guest" && socket.data.conversationId) {
        guestSocketByConversation.delete(socket.data.conversationId);
        void (async () => {
          const conversation = await db.getSupportConversationById(socket.data.conversationId!);
          if (conversation?.contactId) await db.updateContact(conversation.contactId, { connectionStatus: "offline" });
        })();
      }
    });
  });

  return io;
}
