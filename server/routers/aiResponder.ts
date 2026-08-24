import { z } from "zod";
import { supportChannelValues } from "../../shared/supportChannels";
import { generateCustomerReplyPreview } from "../customerResponder";
import * as db from "../db";
import { publicProcedure, router } from "../_core/trpc";

const responderModels = ["gpt-5-mini", "gpt-5-nano", "gemini-3-flash-preview", "claude-haiku-4-5"] as const;
const responderSettingsSchema = z.object({
  enabled: z.boolean(),
  model: z.enum(responderModels),
  instruction: z.string().trim().min(20, "اكتب توجيهاً لا يقل عن 20 حرفاً.").max(2000),
});

function settingMap(settings: Array<{ settingKey: string; settingValue: string }>) {
  return Object.fromEntries(settings.map(setting => [setting.settingKey, setting.settingValue]));
}

export const aiResponderRouter = router({
  settings: publicProcedure.query(async () => {
    const settings = settingMap(await db.listSafeSettings());
    return {
      customer: {
        enabled: settings["ai.customer.enabled"] !== "false",
        model: responderModels.includes(settings["ai.customer.model"] as (typeof responderModels)[number]) ? settings["ai.customer.model"] : "gpt-5-mini",
        instruction: settings["ai.customer.instruction"] || "أجب بالعربية الفصحى الودية في جملتين إلى أربع جمل. إذا احتاج الأمر تحققاً أو تدخل فريق، وضّح أن المتابعة ستنتقل للفريق. لا تختلق معلومات أو وعوداً أو مواعيد.",
      },
      customerModels: responderModels,
      repairAgent: { configured: Boolean(process.env.GEMINI_API_KEY), route: "/dashboard/app-agent" },
    };
  }),
  saveCustomerSettings: publicProcedure.input(responderSettingsSchema).mutation(async ({ input }) => {
    await Promise.all([
      db.setSafeSetting("ai.customer.enabled", String(input.enabled), null),
      db.setSafeSetting("ai.customer.model", input.model, null),
      db.setSafeSetting("ai.customer.instruction", input.instruction, null),
    ]);
    return { success: true as const };
  }),
  testCustomerReply: publicProcedure.input(z.object({ content: z.string().trim().min(2).max(1000), channel: z.enum(supportChannelValues).default("institution") })).mutation(async ({ input }) => {
    return { reply: await generateCustomerReplyPreview(input) };
  }),
});
