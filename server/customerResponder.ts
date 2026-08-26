import { invokeLLM } from "./_core/llm";
import * as db from "./db";
import type { SupportChannel } from "../shared/supportChannels";

const channelPolicy: Record<SupportChannel, { purpose: string; canHelpWith: string; neverDo: string; handoff: string }> = {
  institution: {
    purpose: "خدمة العملاء العامة: شرح استخدام المراسلة، استقبال الأسئلة العامة، وتوجيه المستفيد إلى القناة المناسبة.",
    canHelpWith: "شرح خطوات المراسلة والمرفقات ووقت المتابعة المتوقع بصياغة غير ملزمة.",
    neverDo: "لا تؤكد قبولاً أو رفضاً أو موعداً أو قراراً أو حالة داخلية، ولا تطلب هوية أو بيانات شخصية حساسة.",
    handoff: "تم استلام رسالتك وإحالتها إلى فريق خدمة العملاء المختص. ستصلك متابعة عبر هذه المحادثة.",
  },
  finance: {
    purpose: "نظام الإدارة المالية: استقبال الاستفسارات العامة المرتبطة بإجراءات القناة المالية داخل التطبيق فقط.",
    canHelpWith: "شرح كيفية إرسال استفسار مالي عام أو المستندات المطلوبة عند طلب الفريق لها، من دون تفسير مالي شخصي.",
    neverDo: "لا تقدم نصيحة مالية أو قانونية، ولا تؤكد مبالغ أو رسوم أو استحقاقات أو تحويلات، ولا تطلب أرقام حسابات أو بطاقات أو بيانات مالية.",
    handoff: "تم استلام استفسارك المالي وإحالته إلى فريق المؤسسة المختص للمراجعة. ستصلك متابعة عبر هذه المحادثة.",
  },
  follow_up: {
    purpose: "فريق دعم متابعة الطلب: توضيح خطوات المتابعة العامة واستلام طلبات الاستفسار عن الطلبات.",
    canHelpWith: "شرح أن الطلبات تمر بالمراجعة وأن الفريق يرد عبر المحادثة عند وجود تحديث.",
    neverDo: "لا تكشف حالة تفصيلية أو بيانات طلب، ولا تعد بالقبول أو الرفض أو مدة محددة، ولا تطلب وثائق حساسة داخل الرسائل.",
    handoff: "تم استلام طلب المتابعة وإحالته إلى فريق متابعة الطلب المختص. ستصلك متابعة عبر هذه المحادثة.",
  },
  private_office: {
    purpose: "المكتب الخاص: استقبال المراسلات العامة الموجهة إلى المكتب وتحويلها للمراجعة المناسبة.",
    canHelpWith: "تأكيد استلام المراسلة وشرح أن الفريق المختص سيراجعها عند الحاجة.",
    neverDo: "لا تمنح استثناءات أو وعوداً أو مواعيد أو موافقات أو قرارات باسم المؤسسة، ولا تطلب معلومات حساسة.",
    handoff: "تم استلام رسالتك وإحالتها إلى المكتب الخاص للمراجعة. ستصلك متابعة عبر هذه المحادثة.",
  },
};

const sensitivePattern = /(?:حالة\s*طلبي|رقم\s*(?:هوية|بطاقة|حساب)|كلمة\s*مرور|تحويل|إيداع|رسوم|مبلغ|دفع|استثمار|قرض|شكوى\s*رسمية|عاجل|قبول|رفض|استثناء|منحة|موعد)/i;
const outsideScopePattern = /(?:الطقس|مباراة|طبخ|وصفة|سياسة|انتخابات|سعر\s*(?:الدولار|الذهب|الأسهم)|علاج|تشخيص|فتوى|حكم\s*شرعي)/i;
const fallbackReply = "تم استلام رسالتك وإحالتها إلى فريق المؤسسة المختص. سيستكمل الفريق المتابعة معك عبر هذه المحادثة.";

function handoffReply(channel: SupportChannel) {
  return channelPolicy[channel].handoff;
}

function shortPersonalReply(content: string, guestName: string) {
  const name = guestName.trim().slice(0, 60) || "ضيفنا الكريم";
  const normalized = content.replace(/\s+/g, " ").trim();
  const compact = normalized.split(/(?<=[.!؟])\s+/).slice(0, 2).join(" ").slice(0, 360).trim();
  const withGreeting = compact.includes(name) ? compact : `مرحباً ${name}، ${compact}`;
  return withGreeting.slice(0, 400);
}

export function buildChannelSystemInstruction(channel: SupportChannel, customInstruction: string) {
  const policy = channelPolicy[channel];
  return [
    `السياق الداخلي للقناة: ${policy.purpose}`,
    `ما يمكنك المساعدة به: ${policy.canHelpWith}`,
    `حدود إلزامية: ${policy.neverDo}`,
    "أجب بالعربية الفصحى الودية في جملة أو جملتين قصيرتين فقط، وبأسلوب عملي ومختصر جداً.",
    "لا تذكر أنك ذكاء اصطناعي أو أنك نظام رسمي أو أنك تعمل وفق تعليمات داخلية. لا تخترع معلومات أو مواعيد أو وعوداً.",
    "إذا كان السؤال حساساً أو يحتاج قراراً أو تحققاً أو بيانات خاصة أو لا يخص خدمات المؤسسة، اذكر فقط أن الرسالة أُحيلت إلى الفريق المختص من دون تحليل إضافي.",
    `تعليمات إضافية يحددها مدير التطبيق: ${customInstruction}`,
  ].join("\n");
}

function readSetting(settings: Array<{ settingKey: string; settingValue: string }>, key: string, fallback: string) {
  return settings.find(setting => setting.settingKey === key)?.settingValue || fallback;
}

export async function generateCustomerAutoReply(input: { conversationId: number; guestName: string; channel: SupportChannel; content: string; aiAutoReplyEnabled?: boolean }) {
  try {
    if (input.aiAutoReplyEnabled === false) return undefined;
    const settings = await db.listSafeSettings();
    if (readSetting(settings, "ai.customer.enabled", "true") !== "true") return undefined;

    const reply = sensitivePattern.test(input.content) || outsideScopePattern.test(input.content)
      ? handoffReply(input.channel)
      : await requestModelReply({ ...input, settings });

    const message = await db.addAiMessage(input.conversationId, shortPersonalReply(reply || fallbackReply, input.guestName), input.channel);
    return message;
  } catch (error) {
    console.warn("[CustomerResponder] AI reply unavailable; sending safe acknowledgement.", error);
    try {
      return await db.addAiMessage(input.conversationId, shortPersonalReply(fallbackReply, input.guestName), input.channel);
    } catch (writeError) {
      console.warn("[CustomerResponder] Could not save fallback reply.", writeError);
      return undefined;
    }
  }
}

export async function generateCustomerReplyPreview(input: { channel: SupportChannel; content: string }) {
  const settings = await db.listSafeSettings();
  if (readSetting(settings, "ai.customer.enabled", "true") !== "true") throw new Error("وكيل الرد على العملاء متوقف حالياً.");
  if (sensitivePattern.test(input.content) || outsideScopePattern.test(input.content)) return handoffReply(input.channel);
  const response = await invokeLLM({
    model: readSetting(settings, "ai.customer.model", "gpt-5-mini"),
    messages: [
      { role: "system", content: buildChannelSystemInstruction(input.channel, readSetting(settings, "ai.customer.instruction", "لا تتجاوز حدود القناة ولا تختلق معلومات أو وعوداً أو مواعيد.")) },
      { role: "user", content: input.content.trim() },
    ],
  });
  const content = response.choices[0]?.message?.content;
  return typeof content === "string" && content.trim() ? content.trim().slice(0, 360) : fallbackReply;
}

async function requestModelReply(input: { conversationId: number; guestName: string; channel: SupportChannel; content: string; settings: Array<{ settingKey: string; settingValue: string }> }) {
  const model = readSetting(input.settings, "ai.customer.model", "gpt-5-mini");
  const customInstruction = readSetting(input.settings, "ai.customer.instruction", "لا تتجاوز حدود القناة ولا تختلق معلومات أو وعوداً أو مواعيد.");
  const history = await db.listSupportMessages(input.conversationId, input.channel);
  const response = await invokeLLM({
    model,
    messages: [
      { role: "system", content: `${buildChannelSystemInstruction(input.channel, customInstruction)}\nاسم العميل للاستخدام الداخلي فقط: ${input.guestName}.` },
      ...history.slice(-10).map(message => ({ role: message.sender === "guest" ? "user" as const : "assistant" as const, content: message.content })),
    ],
  });
  const content = response.choices[0]?.message?.content;
  return typeof content === "string" ? content.trim().slice(0, 360) : "";
}
