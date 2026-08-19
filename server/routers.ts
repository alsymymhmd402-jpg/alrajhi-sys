import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { callsRouter } from "./routers/calls";
import { contactsRouter } from "./routers/contacts";
import { invitationsRouter } from "./routers/invitations";
import { operationsRouter } from "./routers/operations";
import { requestsRouter } from "./routers/requests";
import { supportRouter } from "./routers/support";
import { voiceRouter } from "./routers/voice";

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),
  support: supportRouter,
  invitations: invitationsRouter,
  calls: callsRouter,
  contacts: contactsRouter,
  requests: requestsRouter,
  operations: operationsRouter,
  voice: voiceRouter,
});

export type AppRouter = typeof appRouter;
