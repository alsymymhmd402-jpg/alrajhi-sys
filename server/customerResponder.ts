import { invokeLLM } from "./_core/llm";
import * as db from "./db";
import type { SupportChannel } from "../shared/supportChannels";

const channelContext: Record<SupportChannel, string> = {
  institution: "أنت ممثل خدمة عملاء مؤسسة الوليد بن طلال الإنسانية.",
  finance: "أنت مساعد نظام الإدارة المالية في مؤسسة الوليد بن طلال الإنسانية. لا تقدم نصائح مالية شخصية ولا تطلب بيانات حساسة.",
  follow_up: "أنت مساعد فريق دعم متابعة الطلب في مؤسسة الوليد بن طلال الإنسانية. لا تعد بالقبول أو بنتيجة الطلب.",
  private_office: "أنت مساعد المكتب الخاص في مؤسسة الوليد بن طلال الإنسانية. لا تقدم تأكيدات أو قرارات باسم المؤسسة دون توجيه صريح من الفريق.",
};

const sensitivePattern = /(?:حالة\s*طلبي|رقم\s*(?:هوية|بطاقة|حساب)|كلمة\s*مرور|تحويل|إيداع|شكوى\s*رسمية|عاجل)/i;
const fallbackReply = "تم استلام رسالتك وإحالتها إلى فريق المؤسسة المختص. سيستكمل الفريق المتابعة معك عبر هذه المحادثة.";

function readSetting(settings: Array<{ settingKey: string; settingValue: string }>, key: string, fallback: string) {
  return settings.find(setting => setting.settingKey === key)?.settingValue || fallback;
}

export async function generateCustomerAutoReply(input: { conversationId: number; guestName: string; channel: SupportChannel; content: string }) {
  try {
    const settings = await db.listSafeSettings();
    if (readSetting(settings, "ai.customer.enabled", "true") !== "true") return undefined;

    const reply = sensitivePattern.test(input.content)
      ? "تم إرسال طلبك إلى فريق الدعم المختص للمراجعة. ستصلك متابعة عبر هذه المحادثة قريباً."
      : await requestModelReply({ ...input, settings });

    const message = await db.addOwnerMessage(input.conversationId, reply || fallbackReply, input.channel);
    return message;
  } catch (error) {
    console.warn("[CustomerResponder] AI reply unavailable; sending safe acknowledgement.", error);
    try {
      return await db.addOwnerMessage(input.conversationId, fallbackReply, input.channel);
    } catch (writeError) {
      console.warn("[CustomerResponder] Could not save fallback reply.", writeError);
      return undefined;
    }
  }
}

export async function generateCustomerReplyPreview(input: { channel: SupportChannel; content: string }) {
  const settings = await db.listSafeSettings();
  if (readSetting(settings, "ai.customer.enabled", "true") !== "true") throw new Error("وكيل الرد على العملاء متوقف حالياً.");
  if (sensitivePattern.test(input.content)) return "تم إرسال طلبك إلى فريق الدعم المختص للمراجعة. ستصلك متابعة عبر هذه المحادثة قريباً.";
  const response = await invokeLLM({
    model: readSetting(settings, "ai.customer.model", "gpt-5-mini"),
    messages: [
      { role: "system", content: `${channelContext[input.channel]} ${readSetting(settings, "ai.customer.instruction", "أجب بالعربية الفصحى الودية في جملتين إلى أربع جمل. لا تختلق معلومات أو وعوداً أو مواعيد.")}` },
      { role: "user", content: input.content.trim() },
    ],
  });
  const content = response.choices[0]?.message?.content;
  return typeof content === "string" && content.trim() ? content.trim().slice(0, 1400) : fallbackReply;
}

async function requestModelReply(input: { conversationId: number; guestName: string; channel: SupportChannel; content: string; settings: Array<{ settingKey: string; settingValue: string }> }) {
  const model = readSetting(input.settings, "ai.customer.model", "gpt-5-mini");
  const customInstruction = readSetting(input.settings, "ai.customer.instruction", "أجب بالعربية الفصحى الودية في جملتين إلى أربع جمل. إذا احتاج الأمر تحققاً أو تدخل فريق، وضّح أن المتابعة ستنتقل للفريق. لا تختلق معلومات أو وعوداً أو مواعيد.");
  const history = await db.listSupportMessages(input.conversationId, input.channel);
  const response = await invokeLLM({
    model,
    messages: [
      { role: "system", content: `${channelContext[input.channel]} ${customInstruction} العميل اسمه ${input.guestName}.` },
      ...history.slice(-10).map(message => ({ role: message.sender === "guest" ? "user" as const : "assistant" as const, content: message.content })),
    ],
  });
  const content = response.choices[0]?.message?.content;
  return typeof content === "string" ? content.trim().slice(0, 1400) : "";
}
