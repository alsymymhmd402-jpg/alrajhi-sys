import { invokeLLM } from "./_core/llm";

export type AssistantDecision = { action: "reply" | "handoff"; reply: string };
type HistoryMessage = { sender: "guest" | "owner" | "assistant" | "system"; content: string };

const handoffReply = "شكرًا لتوضيح طلبك. سيتم الآن توجيه محادثتك إلى فريق خدمة العملاء لمراجعة التفاصيل والرد عليك بشكل دقيق.";
const sensitivePattern = /(حالة.*طلب|قبول|رفض|استحقاق|مستند|وثيقة|حساب|تعديل.*بيانات|شكوى|قانون|مالي|دفعة|مبلغ|تواصل.*موظف|موظف|موظفة)/i;

export function requiresHumanSupport(content: string) {
  return sensitivePattern.test(content);
}

export async function decideSupportAssistantReply(input: { content: string; history: HistoryMessage[] }): Promise<AssistantDecision> {
  if (requiresHumanSupport(input.content)) return { action: "handoff", reply: handoffReply };
  try {
  const response = await invokeLLM({
    model: "gpt-5-mini",
    maxCompletionTokens: 320,
    reasoning: { effort: "minimal" },
    messages: [
      { role: "system", content: `أنت «مساعد مؤسسة الوليد الإنسانية»، المساعد الآلي الرسمي داخل خدمة العملاء. أجب بالعربية بفقرة واحدة قصيرة جداً (حتى 240 حرفاً). لا تذكر أنك موظف بشري ولا تدّعِ قبولاً أو رفضاً أو حالة طلب أو موعداً أو مبلغاً أو برنامجاً أو رابطاً غير مؤكد. المعرفة المسموح بها فقط: المؤسسة جهة إنسانية، ويمكن للعميل إرسال استفساره من هذه المحادثة ليتابعه الفريق عند الحاجة. إذا كان السؤال يحتاج بيانات خاصة أو قراراً أو مراجعة أو معلومة غير مؤكدة، أخرج JSON بالحرف التالي فقط: {"action":"handoff","reply":"${handoffReply}"}. وإلا أخرج JSON فقط: {"action":"reply","reply":"رد عربي قصير ومهذب"}.` },
      { role: "user", content: `سياق مقتضب للمحادثة:\n${input.history.slice(-6).map(item => `${item.sender}: ${item.content.slice(0, 260)}`).join("\n")}\n\nرسالة العميل الجديدة: ${input.content}` },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "support_assistant_decision",
        strict: true,
        schema: {
          type: "object",
          properties: { action: { type: "string", enum: ["reply", "handoff"] }, reply: { type: "string" } },
          required: ["action", "reply"],
          additionalProperties: false,
        },
      },
    },
  });
    const content = response.choices[0]?.message.content;
    const parsed = JSON.parse(typeof content === "string" ? content : "{}") as AssistantDecision;
    if ((parsed.action === "reply" || parsed.action === "handoff") && parsed.reply.trim()) return { action: parsed.action, reply: parsed.reply.trim().slice(0, 280) };
  } catch { /* Fall through to a safe handoff. */ }
  return { action: "handoff", reply: handoffReply };
}

export const supportAssistantHandoffReply = handoffReply;
