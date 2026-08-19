import { z } from "zod";
import * as db from "../db";
import { adminProcedure, publicProcedure, router } from "../_core/trpc";

const guestExperienceKeys = new Set([
  "platform_name", "owner_name", "owner_avatar_url", "welcome_message",
  "guest_require_email", "guest_show_phone", "guest_show_extra_data",
]);

export const operationsRouter = router({
  summary: adminProcedure.query(() => db.getOperationsSummary()),
  activity: adminProcedure.query(() => db.getOperationsActivity()),
  settings: adminProcedure.query(() => db.listSafeSettings()),
  guestExperience: publicProcedure.query(async () => {
    const settings = await db.listSafeSettings();
    return Object.fromEntries(settings.filter(setting => guestExperienceKeys.has(setting.settingKey)).map(setting => [setting.settingKey, setting.settingValue]));
  }),
  setSetting: adminProcedure.input(z.object({ key: z.string().trim().min(2).max(120), value: z.string().trim().max(3000) })).mutation(async ({ input, ctx }) => {
    await db.setSafeSetting(input.key, input.value, ctx.user.id);
    return { success: true } as const;
  }),
});
