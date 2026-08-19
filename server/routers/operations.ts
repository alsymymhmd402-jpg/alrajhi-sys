import { z } from "zod";
import * as db from "../db";
import { publicProcedure, router } from "../_core/trpc";

const guestExperienceKeys = new Set([
  "platform_name", "owner_name", "owner_avatar_url", "welcome_message",
  "guest_require_email", "guest_show_phone", "guest_show_extra_data",
]);

export const operationsRouter = router({
  summary: publicProcedure.query(() => db.getOperationsSummary()),
  activity: publicProcedure.query(() => db.getOperationsActivity()),
  settings: publicProcedure.query(() => db.listSafeSettings()),
  guestExperience: publicProcedure.query(async () => {
    const settings = await db.listSafeSettings();
    return Object.fromEntries(settings.filter(setting => guestExperienceKeys.has(setting.settingKey)).map(setting => [setting.settingKey, setting.settingValue]));
  }),
  setSetting: publicProcedure.input(z.object({ key: z.string().trim().min(2).max(120), value: z.string().trim().max(3000) })).mutation(async ({ input }) => {
    await db.setSafeSetting(input.key, input.value, null);
    return { success: true } as const;
  }),
});
