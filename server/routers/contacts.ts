import { TRPCError } from "@trpc/server";
import { z } from "zod";
import * as db from "../db";
import { adminProcedure, router } from "../_core/trpc";

export const contactsRouter = router({
  list: adminProcedure.input(z.object({ search: z.string().trim().max(120).optional() }).optional()).query(({ input }) => db.listContacts(input?.search)),
  detail: adminProcedure.input(z.object({ id: z.number().int().positive() })).query(async ({ input }) => {
    const result = await db.getContactDetails(input.id);
    if (!result) throw new TRPCError({ code: "NOT_FOUND", message: "جهة الاتصال غير موجودة." });
    return result;
  }),
});
