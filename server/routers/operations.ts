import { z } from "zod";
import * as db from "../db";
import { adminProcedure, router } from "../_core/trpc";

export const operationsRouter = router({
  summary: adminProcedure.query(() => db.getOperationsSummary()),
  settings: adminProcedure.query(() => db.listSafeSettings()),
  setSetting: adminProcedure.input(z.object({ key: z.string().trim().min(2).max(120), value: z.string().trim().max(3000) })).mutation(async ({ input, ctx }) => {
    await db.setSafeSetting(input.key, input.value, ctx.user.id);
    return { success: true } as const;
  }),
});
