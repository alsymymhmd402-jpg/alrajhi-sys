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

const ownerTokens = new Map<string, OwnerToken>();
const guestSocketByCall = new Map<number, string>();
const callStartedAt = new Map<number, number>();
const OWNER_LOBBY = "owner:lobby";

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

async function verifyCallAccess(socket: RealtimeSocket, callId: number) {
  const call = await db.getCallLog(callId);
  if (!call || call.mode !== "direct") return undefined;
  if (socket.data.role === "guest" && call.conversationId !== socket.data.conversationId) return undefined;
  return call;
}

export function registerRealtimeGateway(server: HttpServer) {
  const io = new Server(server, {
    path: "/api/realtime",
    cors: { origin: true, credentials: true },
  });

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
      socket.emit("call:ringing", { callId });
    });

    socket.on("call:accept", async ({ callId }: { callId: number }) => {
      if (socket.data.role !== "owner" || !Number.isInteger(callId)) return;
      const call = await verifyCallAccess(socket, callId);
      const guestSocketId = guestSocketByCall.get(callId);
      if (!call || !guestSocketId) return;
      const room = callRoom(callId);
      socket.join(room);
      const guestSocket = io.sockets.sockets.get(guestSocketId) as RealtimeSocket | undefined;
      guestSocket?.join(room);
      callStartedAt.set(callId, Date.now());
      await db.updateCallLog(callId, { status: "connected", startedAt: new Date() });
      io.to(room).emit("call:accepted", { callId });
    });

    socket.on("call:reject", async ({ callId }: { callId: number }) => {
      if (socket.data.role !== "owner" || !Number.isInteger(callId)) return;
      const call = await verifyCallAccess(socket, callId);
      const guestSocketId = guestSocketByCall.get(callId);
      if (!call) return;
      await db.updateCallLog(callId, { status: "cancelled", endedAt: new Date() });
      if (guestSocketId) io.to(guestSocketId).emit("call:ended", { callId, reason: "رفض فريق الدعم المكالمة." });
      guestSocketByCall.delete(callId);
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
      if (!Number.isInteger(callId) || !(await verifyCallAccess(socket, callId))) return;
      const started = callStartedAt.get(callId);
      const durationSeconds = started ? Math.max(0, Math.floor((Date.now() - started) / 1000)) : 0;
      await db.updateCallLog(callId, { status: "ended", endedAt: new Date(), durationSeconds, failureReason: reason?.slice(0, 300) });
      io.to(callRoom(callId)).emit("call:ended", { callId, reason: reason ?? "انتهت المكالمة." });
      guestSocketByCall.delete(callId);
      callStartedAt.delete(callId);
    });

    socket.on("disconnect", () => {
      if (socket.data.role === "guest" && socket.data.callId) {
        io.to(OWNER_LOBBY).emit("call:guest-disconnected", { callId: socket.data.callId });
      }
    });
  });

  return io;
}
