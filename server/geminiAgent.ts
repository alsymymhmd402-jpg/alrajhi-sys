export type AgentActionType = "update_setting" | "acknowledge_alert" | "manual_development";

export type AgentPlan = {
  response: string;
  proposal?: {
    title: string;
    summary: string;
    actionType: AgentActionType;
    actionPayload: Record<string, unknown>;
    impact: string;
  };
};

const allowedSettingKeys = [
  "brand.primaryColor",
  "brand.buttonRadius",
  "guest.welcomeMessage",
] as const;

export function isAllowedSettingValue(settingKey: string, settingValue: string) {
  const value = settingValue.trim();
  if (settingKey === "brand.primaryColor") return /^#[0-9a-fA-F]{6}$/.test(value);
  if (settingKey === "brand.buttonRadius") return /^(?:[4-9]|[1-4][0-9]|50)px$/.test(value);
  if (settingKey === "guest.welcomeMessage") return value.length >= 8 && value.length <= 320;
  return false;
}

const agentInstructions = `أنت وكيل التطبيق الخاص بلوحة Voice Circle العربية. أجب بالعربية الفصحى الواضحة.
أنت تُحلل الطلب وتشرح النتيجة. لا تدّعِ أنك نفذت أي تغيير، ولا تقترح تنفيذ أي شيء خارج بطاقة معاينة خاضعة لموافقة المالك.
معرفتك المتاحة هي: لوحة التحكم، العملاء، الطلبات، المحادثات، روابط الدعوة، المكالمات، Voice AI، النماذج الصوتية والإعدادات. لا تملك أي مفاتيح API أو متغيرات بيئة أو ملفات نظام أو وصول حر إلى قاعدة البيانات.
الإجراءات الوحيدة التي يمكن أن تكون قابلة للتنفيذ داخل الموقع هي:
1) update_setting مع مفتاح واحد حصراً من: ${allowedSettingKeys.join(", ")}. قيمة اللون يجب أن تكون #RRGGBB، ونصف قطر الزر بين 4px و50px، ورسالة الترحيب بين 8 و320 حرفاً.
2) acknowledge_alert لتنبيه تشغيلي معروف مع alertId رقمي وحالة dismissed أو resolved.
أما تغيير الشيفرة أو بنية الصفحات أو إضافة ميزات أو إصلاح أخطاء شيفرة فيجب أن يكون actionType = manual_development؛ اشرح أنه طلب تطوير يحتاج تنفيذ مراجَعاً خارج قائمة الإجراءات الآمنة.
أعد JSON فقط مطابقاً للشكل: {"response":"...","proposal":null أو {"title":"...","summary":"...","actionType":"update_setting|acknowledge_alert|manual_development","actionPayload":{},"impact":"..."}}.`;

function extractText(payload: unknown) {
  const value = payload as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
  return value.candidates?.[0]?.content?.parts?.map(part => part.text ?? "").join("").trim() ?? "";
}

function safePlan(value: unknown): AgentPlan {
  const parsed = value as Partial<AgentPlan>;
  if (typeof parsed.response !== "string" || !parsed.response.trim()) {
    return { response: "تعذر تنظيم الرد في بطاقة قابلة للتنفيذ. يمكنك إعادة صياغة الطلب بصورة أكثر تحديداً." };
  }
  const proposal = parsed.proposal;
  if (!proposal || typeof proposal !== "object") return { response: parsed.response.trim() };

  const candidate = proposal as NonNullable<AgentPlan["proposal"]> & { actionPayload?: Record<string, unknown> | string; action_type?: string };
  const actionType = candidate.actionType ?? candidate.action_type;
  let actionPayload: Record<string, unknown> | undefined;
  if (typeof candidate.actionPayload === "string") {
    try { actionPayload = JSON.parse(candidate.actionPayload) as Record<string, unknown>; } catch { actionPayload = undefined; }
  } else if (candidate.actionPayload && typeof candidate.actionPayload === "object") {
    actionPayload = candidate.actionPayload;
  }
  if (!candidate.title || !candidate.summary || !candidate.impact || !actionPayload) return { response: parsed.response.trim() };
  if (!["update_setting", "acknowledge_alert", "manual_development"].includes(actionType)) return { response: parsed.response.trim() };

  if (actionType === "update_setting") {
    const settingKey = actionPayload.settingKey;
    const settingValue = actionPayload.settingValue;
    if (!allowedSettingKeys.includes(settingKey as typeof allowedSettingKeys[number]) || typeof settingValue !== "string" || !isAllowedSettingValue(String(settingKey), settingValue)) return { response: parsed.response.trim() };
  }
  if (actionType === "acknowledge_alert") {
    if (typeof actionPayload.alertId !== "number" || !["dismissed", "resolved"].includes(String(actionPayload.status))) return { response: parsed.response.trim() };
  }

  return {
    response: parsed.response.trim(),
    proposal: {
      title: String(candidate.title).slice(0, 220),
      summary: String(candidate.summary),
      actionType: actionType as AgentActionType,
      actionPayload,
      impact: String(candidate.impact).slice(0, 500),
    },
  };
}

function fallbackProposalFromRequest(message: string, response: string): AgentPlan {
  const color = message.match(/#[0-9a-fA-F]{6}\b/)?.[0];
  if (color && /(لون|أزرار|العلامة)/.test(message)) {
    return {
      response,
      proposal: {
        title: "تحديث لون الأزرار الرئيسي",
        summary: `سيُحفظ اللون ${color.toUpperCase()} كلون رئيسي معتمد لتجربة العلامة التجارية.`,
        actionType: "update_setting",
        actionPayload: { settingKey: "brand.primaryColor", settingValue: color.toUpperCase() },
        impact: "يؤثر الإعداد على العناصر التي تستخدم اللون الرئيسي في الواجهة بعد اعتماد دعم الإعداد في التصميم.",
      },
    };
  }
  if (/(غيّر|غير|تعديل|تغيير|أضف|انقل|أصلح|اصلاح|إصلاح|ميزة)/.test(message)) {
    return {
      response,
      proposal: {
        title: "طلب تطوير يحتاج مراجعة",
        summary: "يتطلب الطلب تعديلاً في الشيفرة أو في بنية الواجهة، لذلك سُجل كطلب تطوير بدلاً من تنفيذ تلقائي داخل الموقع.",
        actionType: "manual_development",
        actionPayload: { request: message.trim() },
        impact: "لن يتغير التطبيق الآن؛ تعتمد هذه البطاقة طلب التطوير وتبقيه مسجلاً للمراجعة والتنفيذ المنضبط.",
      },
    };
  }
  return { response };
}

export async function createAgentPlan(input: { message: string; memory: Array<{ role: "owner" | "assistant"; content: string }> }): Promise<AgentPlan> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("اعتماد Gemini غير مهيأ لوكيل التطبيق.");

  const contents = [
    ...input.memory.slice(-16).map(message => ({ role: message.role === "assistant" ? "model" : "user", parts: [{ text: message.content }] })),
    { role: "user", parts: [{ text: input.message.trim() }] },
  ];
  const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: agentInstructions }] },
      contents,
      generationConfig: { responseMimeType: "application/json", temperature: 0.2, maxOutputTokens: 1400 },
    }),
  });
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) throw new Error("تعذر التحقق من اعتماد Gemini لوكيل التطبيق.");
    if (response.status === 429) throw new Error("وصل وكيل التطبيق إلى حد Gemini المؤقت. أعد المحاولة بعد قليل.");
    throw new Error("تعذر إنشاء معاينة الوكيل حالياً.");
  }

  const text = extractText(await response.json());
  try {
    const plan = safePlan(JSON.parse(text));
    return plan.proposal ? plan : fallbackProposalFromRequest(input.message, plan.response);
  } catch {
    return fallbackProposalFromRequest(input.message, "أفهم طلبك. أعددت معاينة آمنة قابلة للمراجعة قبل أي تنفيذ.");
  }
}

export { allowedSettingKeys };
