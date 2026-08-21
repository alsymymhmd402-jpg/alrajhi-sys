import * as db from "./db";

type HealthIssue = { severity: "warning" | "error"; title: string; detail: string; source: string };

export async function runAgentHealthReview() {
  const issues: HealthIssue[] = [];
  const database = await db.getDb();
  if (!database) {
    throw new Error("تعذر الاتصال بقاعدة البيانات أثناء الفحص الدوري.");
  }
  if (!process.env.GEMINI_API_KEY) {
    issues.push({ severity: "warning", title: "اعتماد وكيل التطبيق غير مهيأ", detail: "لا يمكن لوكيل التطبيق تحليل الطلبات الجديدة حتى يتهيأ اعتماد النموذج على الخادم.", source: "agent.health.gemini_credential" });
  }
  const createdAlerts: number[] = [];
  for (const issue of issues) {
    const existing = await db.getOpenAgentAlertBySource(issue.source);
    if (!existing) {
      const alert = await db.createAgentAlert(issue);
      createdAlerts.push(alert.id);
    }
  }
  return { ok: true, checkedAt: new Date().toISOString(), issuesFound: issues.length, createdAlerts };
}
