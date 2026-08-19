import { TRPCError } from "@trpc/server";
import { z } from "zod";
import * as db from "../db";
import { publicProcedure, router } from "../_core/trpc";

export const contactsRouter = router({
  list: publicProcedure.input(z.object({ search: z.string().trim().max(120).optional() }).optional()).query(({ input }) => db.listContacts(input?.search)),
  detail: publicProcedure.input(z.object({ id: z.number().int().positive() })).query(async ({ input }) => {
    const result = await db.getContactDetails(input.id);
    if (!result) throw new TRPCError({ code: "NOT_FOUND", message: "جهة الاتصال غير موجودة." });
    return result;
  }),
  update: publicProcedure.input(z.object({ id: z.number().int().positive(), displayName: z.string().trim().min(2).max(120).optional(), email: z.string().trim().email().max(320).nullable().optional(), phone: z.string().trim().max(40).nullable().optional(), avatarUrl: z.string().url().max(600).nullable().optional(), extraData: z.string().trim().max(2000).nullable().optional(), connectionStatus: z.enum(["online", "offline", "away"]).optional() })).mutation(async ({ input }) => {
    const { id, ...changes } = input;
    return db.updateContact(id, changes);
  }),
});
