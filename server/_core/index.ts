import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { registerRealtimeGateway } from "../realtime";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  registerRealtimeGateway(server);
  const institutionIcon = "/manus-storage/alwaleed-philanthropies-mark_d87d264e.jpg";
  const renderManifest = (name: string, shortName: string, startUrl: string, themeColor: string) => ({
    name,
    short_name: shortName,
    start_url: startUrl,
    scope: "/",
    display: "standalone",
    background_color: "#e8efe9",
    theme_color: themeColor,
    icons: [
      { src: institutionIcon, sizes: "192x192", type: "image/jpeg", purpose: "any" },
      { src: institutionIcon, sizes: "512x512", type: "image/jpeg", purpose: "any" },
    ],
  });
  app.get("/manifest-owner.webmanifest", (_req, res) => res.type("application/manifest+json").json(renderManifest("غرفة عمليات المؤسسة", "عمليات المؤسسة", "/", "#155eef")));
  app.get("/manifest-client.webmanifest", (req, res) => {
    const requestedStart = typeof req.query.start === "string" ? req.query.start : "/";
    const startUrl = /^\/(invite|client|chat)\//.test(requestedStart) ? requestedStart : "/";
    res.type("application/manifest+json").json(renderManifest("مراسلة المؤسسة", "مراسلة المؤسسة", startUrl, "#075e54"));
  });
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  registerStorageProxy(app);
  registerOAuthRoutes(app);
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
