type ElevenLabsVoice = {
  voice_id: string;
  name: string;
  category?: string;
  description?: string;
  preview_url?: string;
  labels?: Record<string, string>;
};

type ElevenLabsVoiceList = { voices?: ElevenLabsVoice[] };

const apiBase = "https://api.elevenlabs.io";

function getApiKey() {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key?.startsWith("sk_")) throw new Error("مفتاح ElevenLabs غير مهيأ بصورة صحيحة.");
  return key;
}

async function ensureSuccess(response: Response, operation: string) {
  if (response.ok) return;
  if (response.status === 401 || response.status === 403) throw new Error("تعذر التحقق من اعتماد ElevenLabs.");
  if (response.status === 402) throw new Error("رصيد ElevenLabs غير كافٍ لتوليد أو تحويل الصوت حالياً.");
  if (response.status === 429) throw new Error("تم الوصول إلى حد ElevenLabs المؤقت. أعد المحاولة بعد قليل.");
  throw new Error(`تعذر ${operation} من ElevenLabs حالياً.`);
}

export type ProviderVoice = {
  voiceId: string;
  name: string;
  category: string | null;
  description: string | null;
  previewUrl: string | null;
  labels: Record<string, string>;
};

export async function listElevenLabsVoices(): Promise<ProviderVoice[]> {
  const response = await fetch(`${apiBase}/v2/voices?page_size=100&voice_type=saved`, {
    headers: { "xi-api-key": getApiKey() },
  });
  await ensureSuccess(response, "استرجاع مكتبة الأصوات");
  const payload = await response.json() as ElevenLabsVoiceList;
  return (payload.voices ?? []).map(voice => ({
    voiceId: voice.voice_id,
    name: voice.name,
    category: voice.category ?? null,
    description: voice.description ?? null,
    previewUrl: voice.preview_url ?? null,
    labels: voice.labels ?? {},
  }));
}

export async function synthesizeVoicePreview(voiceId: string) {
  const response = await fetch(`${apiBase}/v1/text-to-speech/${encodeURIComponent(voiceId)}/stream?output_format=mp3_22050_32`, {
    method: "POST",
    headers: { "xi-api-key": getApiKey(), "Content-Type": "application/json" },
    body: JSON.stringify({
      text: "مرحباً، هذا مثال للصوت المختار في Voice Circle.",
      model_id: "eleven_multilingual_v2",
      language_code: "ar",
    }),
  });
  await ensureSuccess(response, "إنشاء معاينة الصوت");
  return Buffer.from(await response.arrayBuffer()).toString("base64");
}

export async function convertVoiceChunk(input: { voiceId: string; audio: Buffer; mimeType: string }) {
  const form = new FormData();
  const bytes = new Uint8Array(input.audio.byteLength);
  bytes.set(input.audio);
  form.set("audio", new Blob([bytes], { type: input.mimeType }), "voice-chunk.webm");
  form.set("model_id", "eleven_multilingual_sts_v2");
  form.set("file_format", "other");

  const response = await fetch(`${apiBase}/v1/speech-to-speech/${encodeURIComponent(input.voiceId)}/stream?output_format=mp3_22050_32`, {
    method: "POST",
    headers: { "xi-api-key": getApiKey() },
    body: form,
  });
  await ensureSuccess(response, "تحويل مقطع الصوت");
  return Buffer.from(await response.arrayBuffer()).toString("base64");
}
