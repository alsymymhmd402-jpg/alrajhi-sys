import { createHash, randomInt, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import * as db from "../db";
import { publicProcedure, router } from "../_core/trpc";

const phoneInput = z.string().trim().min(8).max(32);
const otpInput = z.string().trim().regex(/^\d{6}$/, "أدخل رمزاً مكوناً من ستة أرقام.");

function normalizePhone(phone: string) {
  const cleaned = phone.replace(/[\s()-]/g, "");
  if (!/^\+?[1-9]\d{7,14}$/.test(cleaned)) throw new Error("أدخل رقم هاتف دولياً صحيحاً، مثل +9665XXXXXXXX.");
  return cleaned.startsWith("+") ? cleaned : `+${cleaned}`;
}

function hashOtp(phone: string, code: string) {
  return createHash("sha256").update(`${phone}:${code}:${process.env.JWT_SECRET ?? "voice-circle"}`).digest("hex");
}

function twilioSettings() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM_NUMBER;
  return accountSid && authToken && from ? { accountSid, authToken, from } : undefined;
}

async function deliverTwilioOtp(input: { to: string; code: string }) {
  const settings = twilioSettings();
  if (!settings) return undefined;
  const form = new URLSearchParams({
    To: input.to,
    From: settings.from,
    Body: `رمز التحقق لمراسلة المؤسسة هو: ${input.code}. ينتهي خلال 5 دقائق.`,
  });
  const authorization = Buffer.from(`${settings.accountSid}:${settings.authToken}`).toString("base64");
  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(settings.accountSid)}/Messages.json`, {
    method: "POST",
    headers: { Authorization: `Basic ${authorization}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: form,
  });
  if (!response.ok) throw new Error("تعذر إرسال رمز التحقق برسالة نصية. تحقق من إعداد مزود الرسائل.");
  const payload = await response.json() as { sid?: string };
  return payload.sid;
}

export const guestPortalRouter = router({
  smsStatus: publicProcedure.query(() => ({ configured: Boolean(twilioSettings()), provider: "twilio" as const })),
  requestOtp: publicProcedure.input(z.object({ inviteCode: z.string().trim().min(4).max(24), phone: phoneInput })).mutation(async ({ input }) => {
    const validation = await db.validateInvitation(input.inviteCode);
    if (!validation.invitation) throw new Error("رابط الدعوة غير متاح.");
    const phone = normalizePhone(input.phone);
    if (!twilioSettings()) return { status: "provider_not_configured" as const, phone };

    const latest = await db.getLatestGuestPhoneChallenge(validation.invitation.id, phone);
    if (latest?.status === "pending" && latest.createdAt.getTime() > Date.now() - 60_000) return { status: "rate_limited" as const, phone, retryAfterSeconds: Math.max(1, Math.ceil((latest.createdAt.getTime() + 60_000 - Date.now()) / 1000)) };
    const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
    const challenge = await db.createGuestPhoneChallenge({ invitationId: validation.invitation.id, phone, codeHash: hashOtp(phone, code), expiresAt: new Date(Date.now() + 5 * 60_000) });
    try {
      const providerMessageId = await deliverTwilioOtp({ to: phone, code });
      if (providerMessageId) await db.updateGuestPhoneChallenge(challenge.id, { providerMessageId });
      return { status: "sent" as const, phone, challengeId: challenge.id, expiresAt: challenge.expiresAt };
    } catch (error) {
      await db.updateGuestPhoneChallenge(challenge.id, { status: "blocked" });
      throw error;
    }
  }),
  verifyOtp: publicProcedure.input(z.object({ inviteCode: z.string().trim().min(4).max(24), phone: phoneInput, challengeId: z.number().int().positive(), code: otpInput })).mutation(async ({ input }) => {
    const validation = await db.validateInvitation(input.inviteCode);
    if (!validation.invitation) throw new Error("رابط الدعوة غير متاح.");
    const phone = normalizePhone(input.phone);
    const challenge = await db.getLatestGuestPhoneChallenge(validation.invitation.id, phone);
    if (!challenge || challenge.id !== input.challengeId || challenge.status !== "pending") throw new Error("رمز التحقق غير متاح. اطلب رمزاً جديداً.");
    if (challenge.expiresAt.getTime() < Date.now()) {
      await db.updateGuestPhoneChallenge(challenge.id, { status: "expired" });
      throw new Error("انتهت صلاحية الرمز. اطلب رمزاً جديداً.");
    }
    if (challenge.attempts >= 5) {
      await db.updateGuestPhoneChallenge(challenge.id, { status: "blocked" });
      throw new Error("تم تجاوز عدد المحاولات المسموح. اطلب رمزاً جديداً.");
    }
    const expected = Buffer.from(challenge.codeHash ?? "", "hex");
    const received = Buffer.from(hashOtp(phone, input.code), "hex");
    const valid = expected.length === received.length && timingSafeEqual(expected, received);
    if (!valid) {
      await db.updateGuestPhoneChallenge(challenge.id, { attempts: challenge.attempts + 1 });
      throw new Error("رمز التحقق غير صحيح.");
    }
    await db.updateGuestPhoneChallenge(challenge.id, { status: "verified", verifiedAt: new Date() });
    return { verified: true as const, phone, challengeId: challenge.id };
  }),
});
