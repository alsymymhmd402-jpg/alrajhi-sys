import { TRPCError } from "@trpc/server";
import { z } from "zod";
import * as db from "../db";
import { publicProcedure, router } from "../_core/trpc";

const requestStatusSchema = z.enum(["new", "in_progress", "waiting", "completed", "closed"]);

export const requestsRouter = router({
  list: publicProcedure.input(z.object({ search: z.string().trim().max(120).optional(), status: z.union([requestStatusSchema, z.literal("all")]).optional() }).optional()).query(({ input }) => db.listServiceRequests({ search: input?.search, status: input?.status })),
  update: publicProcedure.input(z.object({ id: z.number().int().positive(), status: requestStatusSchema.optional(), title: z.string().trim().min(2).max(180).optional(), description: z.string().trim().min(2).max(5000).optional() })).mutation(async ({ input }) => {
    const { id, ...changes } = input;
    const request = await db.updateServiceRequest(id, changes);
    if (!request) throw new TRPCError({ code: "NOT_FOUND", message: "الطلب غير موجود." });
    return request;
  }),
});
