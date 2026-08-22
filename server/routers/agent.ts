import { z } from "zod";
import {
  createAgentMessage,
  createAgentProposal,
  createAgentThread,
  createAgentAlert,
  getSafeSetting,
  getAgentProposal,
  getAgentThread,
  listAgentAlerts,
  listAgentMessages,
  listAgentProposals,
  listAgentThreads,
  setSafeSetting,
  updateAgentAlert,
  updateAgentProposal,
  updateAgentThread,
} from "../db";
import { allowedSettingKeys, createAgentPlan, isAllowedSettingValue } from "../geminiAgent";
import { publicProcedure, router } from "../_core/trpc";

const idInput = z.object({ id: z.number().int().positive() });

function parsePayload(value: string) {
  try { return JSON.parse(value) as Record<string, unknown>; } catch { throw new Error("تعذر قراءة تفاصيل بطاقة المعاينة."); }
}

export const agentRouter = router({
  threads: publicProcedure.query(() => listAgentThreads()),
  createThread: publicProcedure.input(z.object({ title: z.string().trim().min(1).max(180) })).mutation(({ input }) => createAgentThread(input.title)),
  archiveThread: publicProcedure.input(idInput).mutation(async ({ input }) => updateAgentThread(input.id, { status: "archived" })),
  workspace: publicProcedure.input(idInput).query(async ({ input }) => {
    const thread = await getAgentThread(input.id);
    if (!thread) throw new Error("لم يتم العثور على محادثة الوكيل.");
    const [messages, proposals, alerts] = await Promise.all([listAgentMessages(input.id), listAgentProposals(input.id), listAgentAlerts("open")]);
    return { thread, messages, proposals, alerts };
  }),
  send: publicProcedure.input(z.object({ threadId: z.number().int().positive(), message: z.string().trim().min(1).max(4000) })).mutation(async ({ input }) => {
    const thread = await getAgentThread(input.threadId);
    if (!thread || thread.status !== "active") throw new Error("لا يمكن الإرسال إلى محادثة غير نشطة.");
    const history = await listAgentMessages(input.threadId);
    const ownerMessage = await createAgentMessage({ threadId: input.threadId, role: "owner", content: input.message });
    const memory = history.filter(item => item.role === "owner" || item.role === "assistant").map(item => ({ role: item.role as "owner" | "assistant", content: item.content }));
    const plan = await createAgentPlan({ message: input.message, memory });
    const proposal = plan.proposal ? await createAgentProposal({
      threadId: input.threadId,
      title: plan.proposal.title,
      summary: plan.proposal.summary,
      actionType: plan.proposal.actionType,
      actionPayload: JSON.stringify(plan.proposal.actionPayload),
      impact: plan.proposal.impact,
    }) : undefined;
    const assistantMessage = await createAgentMessage({ threadId: input.threadId, role: "assistant", kind: proposal ? "proposal" : "chat", content: plan.response, proposalId: proposal?.id ?? null });
    return { ownerMessage, assistantMessage, proposal };
  }),
  approve: publicProcedure.input(idInput).mutation(async ({ input, ctx }) => {
    const proposal = await getAgentProposal(input.id);
    if (!proposal) throw new Error("بطاقة المعاينة غير موجودة.");
    if (proposal.status !== "draft") throw new Error("تم التعامل مع بطاقة المعاينة مسبقاً.");
    const approved = await updateAgentProposal(proposal.id, {
      status: "approved",
      approvedAt: new Date(),
      executionProgress: 8,
      executionStage: "تمت الموافقة، جارٍ تجهيز التنفيذ",
    });

    if (proposal.actionType === "manual_development") {
      const result = "تم اعتماد طلب التطوير وتسجيله في غرفة المراجعة. التغيير في الشيفرة يحتاج إصداراً منشوراً ولا يُنفذ من المتصفح مباشرة حفاظاً على أمان الموقع.";
      const queued = await updateAgentProposal(proposal.id, { executionProgress: 100, executionStage: "طلب تطوير بانتظار إصدار", executionResult: result, verificationResult: "تم تسجيل الطلب للمراجعة قبل النشر." });
      await createAgentMessage({ threadId: proposal.threadId, role: "assistant", kind: "execution", content: result, proposalId: proposal.id });
      return { proposal: queued, result, pendingManualWork: true, readyToExecute: false };
    }
    await createAgentMessage({ threadId: proposal.threadId, role: "system", kind: "execution", content: "تمت الموافقة. سيبدأ الوكيل التنفيذ ثم يتحقق من النتيجة.", proposalId: proposal.id });
    return { proposal: approved, result: "تمت الموافقة. جارٍ بدء التنفيذ…", pendingManualWork: false, readyToExecute: true };
  }),
  execute: publicProcedure.input(idInput).mutation(async ({ input, ctx }) => {
    const proposal = await getAgentProposal(input.id);
    if (!proposal) throw new Error("بطاقة المعاينة غير موجودة.");
    if (proposal.status !== "approved") throw new Error("لا يمكن التنفيذ قبل موافقة صريحة.");
    const startedAt = new Date();
    await updateAgentProposal(proposal.id, { executionStartedAt: startedAt, executionProgress: 30, executionStage: "جارٍ تطبيق التغيير المعتمد" });
    const payload = parsePayload(proposal.actionPayload);
    try {
      if (proposal.actionType === "update_setting") {
        const settingKey = String(payload.settingKey ?? "");
        const settingValue = String(payload.settingValue ?? "");
        if (!allowedSettingKeys.includes(settingKey as typeof allowedSettingKeys[number]) || !isAllowedSettingValue(settingKey, settingValue)) throw new Error("تحتوي البطاقة على إعداد أو قيمة غير مسموحة.");
        await setSafeSetting(settingKey, settingValue.trim(), ctx.user?.id ?? null);
        await updateAgentProposal(proposal.id, { executionProgress: 75, executionStage: "جارٍ التحقق من حفظ الإعداد" });
        const stored = await getSafeSetting(settingKey);
        if (stored?.settingValue !== settingValue.trim()) throw new Error("لم ينجح التحقق من حفظ الإعداد المعتمد.");
        const verificationResult = `تم التحقق من حفظ الإعداد ${settingKey} بالقيمة المعتمدة.`;
        const result = "اكتمل تطبيق التغيير المعتمد ويمكنك مراجعة أثره في الواجهة.";
        const executed = await updateAgentProposal(proposal.id, { status: "executed", executedAt: new Date(), executionProgress: 100, executionStage: "اكتمل التنفيذ والتحقق", executionResult: result, verificationResult });
        await createAgentMessage({ threadId: proposal.threadId, role: "assistant", kind: "execution", content: `${result}\n\n${verificationResult}`, proposalId: proposal.id });
        return { proposal: executed, result, pendingManualWork: false };
      }
      if (proposal.actionType === "acknowledge_alert") {
        const alertId = Number(payload.alertId);
        const status = String(payload.status);
        if (!Number.isInteger(alertId) || !["dismissed", "resolved"].includes(status)) throw new Error("تحتوي البطاقة على تنبيه غير صالح.");
        await updateAgentAlert(alertId, { status: status as "dismissed" | "resolved", resolvedAt: status === "resolved" ? new Date() : null });
        const result = "تم تحديث حالة التنبيه المعتمد وتسجيل النتيجة.";
        const executed = await updateAgentProposal(proposal.id, { status: "executed", executedAt: new Date(), executionProgress: 100, executionStage: "اكتمل التنفيذ والتحقق", executionResult: result, verificationResult: "تم التحقق من إتمام إجراء التنبيه." });
        await createAgentMessage({ threadId: proposal.threadId, role: "assistant", kind: "execution", content: result, proposalId: proposal.id });
        return { proposal: executed, result, pendingManualWork: false };
      }
      throw new Error("هذا النوع من المقترحات يحتاج إصداراً منشوراً ولا ينفذ من المتصفح.");
    } catch (error) {
      const result = error instanceof Error ? error.message : "تعذر تطبيق الإجراء المعتمد.";
      const failed = await updateAgentProposal(proposal.id, { status: "failed", executedAt: new Date(), executionProgress: 100, executionStage: "تعذر التنفيذ", executionResult: result, verificationResult: "لم يكتمل التحقق بسبب فشل التنفيذ." });
      await createAgentMessage({ threadId: proposal.threadId, role: "assistant", kind: "execution", content: result, proposalId: proposal.id });
      return { proposal: failed, result, pendingManualWork: false };
    }
  }),
  cancel: publicProcedure.input(idInput).mutation(async ({ input }) => {
    const proposal = await getAgentProposal(input.id);
    if (!proposal || proposal.status !== "draft") throw new Error("لا توجد بطاقة معلقة للإلغاء.");
    const cancelled = await updateAgentProposal(proposal.id, { status: "cancelled" });
    await createAgentMessage({ threadId: proposal.threadId, role: "assistant", kind: "execution", content: "أُلغي الاقتراح. لم يُطبّق أي تغيير.", proposalId: proposal.id });
    return cancelled;
  }),
  alerts: publicProcedure.input(z.object({ status: z.enum(["open", "dismissed", "resolved", "all"]).optional() })).query(({ input }) => listAgentAlerts(input.status ?? "open")),
  reportAlert: publicProcedure.input(z.object({ severity: z.enum(["info", "warning", "error"]), title: z.string().trim().min(1).max(220), detail: z.string().trim().min(1).max(3000), source: z.string().trim().min(1).max(120) })).mutation(({ input }) => createAgentAlert(input)),
});
