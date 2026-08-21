import { trpc } from "@/lib/trpc";
import { COOKIE_NAME, UNAUTHED_ERR_MSG } from '@shared/const';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink, TRPCClientError } from "@trpc/client";
import { createRoot } from "react-dom/client";
import superjson from "superjson";
import App from "./App";
import { AgentBrandSettings } from "./components/AgentBrandSettings";
import { startLogin } from "./const";
import { getClientAppStartPath, isClientExperiencePath } from "./lib/clientPwa";
import "./index.css";

const configureInstallIdentity = () => {
  const path = window.location.pathname;
  const isClientExperience = isClientExperiencePath(path);
  const clientStart = getClientAppStartPath(path);
  document.title = isClientExperience ? "مراسلة المؤسسة" : "غرفة عمليات المؤسسة";
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", isClientExperience ? "#075e54" : "#155eef");
  const manifest = document.querySelector<HTMLLinkElement>("#app-manifest");
  if (manifest) manifest.href = isClientExperience ? `/manifest-client.webmanifest${clientStart ? `?start=${encodeURIComponent(clientStart)}` : ""}` : "/manifest-owner.webmanifest";
};

configureInstallIdentity();
if ("serviceWorker" in navigator) void navigator.serviceWorker.register("/sw.js").catch(() => undefined);

const queryClient = new QueryClient();

const redirectToLoginIfUnauthorized = (error: unknown) => {
  if (!(error instanceof TRPCClientError)) return;
  if (typeof window === "undefined") return;

  const isUnauthorized = error.message === UNAUTHED_ERR_MSG;

  if (!isUnauthorized) return;

  startLogin();
};

queryClient.getQueryCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.query.state.error;
    redirectToLoginIfUnauthorized(error);
    console.error("[API Query Error]", error);
  }
});

queryClient.getMutationCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.mutation.state.error;
    redirectToLoginIfUnauthorized(error);
    console.error("[API Mutation Error]", error);
  }
});

const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: "/api/trpc",
      transformer: superjson,
      headers() {
        // Preview auto-login fallback: when the browser blocks iframe cookies
        // (Safari ITP / private browsing / WebView), the runtime mirrors the
        // session into sessionStorage so we can forward it as a Bearer token.
        // The regular OAuth cookie flow keeps working and takes priority server-side.
        try {
          const raw = sessionStorage.getItem("manus-cookie");
          if (raw) {
            const prefix = `${COOKIE_NAME}=`;
            const pair = raw.split(";").find(s => s.trim().startsWith(prefix));
            const token = pair?.trim().slice(prefix.length);
            if (token) {
              return { Authorization: `Bearer ${token}` };
            }
          }
        } catch {
          // sessionStorage unavailable
        }
        return {};
      },
      fetch(input, init) {
        return globalThis.fetch(input, {
          ...(init ?? {}),
          credentials: "include",
        });
      },
    }),
  ],
});

createRoot(document.getElementById("root")!).render(
  <trpc.Provider client={trpcClient} queryClient={queryClient}>
    <QueryClientProvider client={queryClient}>
      <AgentBrandSettings />
      <App />
    </QueryClientProvider>
  </trpc.Provider>
);
