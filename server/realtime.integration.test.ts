import { createServer, Server as HttpServer } from "http";
import { AddressInfo } from "net";
import { afterEach, describe, expect, it, vi } from "vitest";
import { io, Socket } from "socket.io-client";

vi.mock("./db", () => ({
  getGuestConversation: vi.fn(async () => ({ id: 77, contactId: 11, guestName: "عميل تجريبي" })),
  getSupportConversationById: vi.fn(async () => ({ id: 77, contactId: 11 })),
  updateContact: vi.fn(async () => undefined),
  getCallLog: vi.fn(async () => undefined),
  updateCallLog: vi.fn(async () => undefined),
}));

import { emitRealtimeMessage, issueOwnerRealtimeToken, registerRealtimeGateway } from "./realtime";

function connected(socket: Socket) {
  return new Promise<void>((resolve, reject) => {
    socket.once("connect", () => resolve());
    socket.once("connect_error", reject);
  });
}

function nextMessage(socket: Socket) {
  return new Promise<{ messageId: number; sender: "guest" | "owner" }>(resolve => socket.once("chat:message", resolve));
}

describe("realtime chat integration", () => {
  const resources: Array<{ server: HttpServer; owner: Socket; guest: Socket; gateway: ReturnType<typeof registerRealtimeGateway> }> = [];
  afterEach(async () => {
    await Promise.all(resources.splice(0).map(async resource => {
      resource.owner.disconnect(); resource.guest.disconnect(); resource.gateway.close();
      await new Promise<void>(resolve => resource.server.close(() => resolve()));
    }));
  });

  it("يوصل chat:message فورياً إلى المالك والضيف في الغرفة نفسها", async () => {
    const server = createServer();
    const gateway = registerRealtimeGateway(server);
    await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
    const { port } = server.address() as AddressInfo;
    const baseUrl = `http://127.0.0.1:${port}`;
    const owner = io(baseUrl, { path: "/api/realtime", transports: ["websocket"], auth: { role: "owner", token: issueOwnerRealtimeToken(1) } });
    const guest = io(baseUrl, { path: "/api/realtime", transports: ["websocket"], auth: { role: "guest", publicId: "public-session", accessToken: "x".repeat(40) } });
    resources.push({ server, gateway, owner, guest });
    await Promise.all([connected(owner), connected(guest)]);
    owner.emit("chat:join", { conversationId: 77 });
    await new Promise(resolve => setTimeout(resolve, 20));
    const ownerMessage = nextMessage(owner);
    const guestMessage = nextMessage(guest);
    emitRealtimeMessage(77, { messageId: 501, sender: "guest" });
    await expect(Promise.all([ownerMessage, guestMessage])).resolves.toEqual([
      { messageId: 501, sender: "guest" },
      { messageId: 501, sender: "guest" },
    ]);
  });
});
