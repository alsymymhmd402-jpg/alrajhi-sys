type ConvertedChunk = { audioBase64: string; mimeType: string };

export function voiceConversionFailureMessage(error: unknown) {
  if (error instanceof Error && error.message) return error.message;
  return "تعذر تحويل الصوت من ElevenLabs.";
}

export type VoiceConversionSession = {
  stream: MediaStream;
  stop: () => void;
};

function bytesToBase64(bytes: Uint8Array) {
  let binary = "";
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    const chunk = bytes.subarray(offset, offset + chunkSize);
    for (let index = 0; index < chunk.length; index += 1) binary += String.fromCharCode(chunk[index]!);
  }
  return btoa(binary);
}

function base64ToArrayBuffer(value: string) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes.buffer;
}

export async function startVoiceConversion(input: {
  inputStream: MediaStream;
  modelId: number;
  convertChunk: (input: { modelId: number; audioBase64: string; mimeType: string }) => Promise<ConvertedChunk>;
  onError: (message: string) => void;
}): Promise<VoiceConversionSession> {
  if (typeof MediaRecorder === "undefined" || typeof AudioContext === "undefined") {
    return { stream: input.inputStream, stop: () => undefined };
  }

  const audioContext = new AudioContext();
  await audioContext.resume();
  const destination = audioContext.createMediaStreamDestination();
  const sourceInput = audioContext.createMediaStreamSource(input.inputStream);
  const fallbackGain = audioContext.createGain();
  sourceInput.connect(fallbackGain);
  fallbackGain.connect(destination);
  const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus" : undefined;
  const recorder = new MediaRecorder(input.inputStream, mimeType ? { mimeType } : undefined);
  let stopped = false;
  let transformedAtLeastOnce = false;
  let failureNotified = false;
  let queue = Promise.resolve();

  recorder.ondataavailable = event => {
    if (stopped || !event.data.size) return;
    queue = queue.then(async () => {
      try {
        const bytes = new Uint8Array(await event.data.arrayBuffer());
        const output = await input.convertChunk({ modelId: input.modelId, audioBase64: bytesToBase64(bytes), mimeType: event.data.type || "audio/webm" });
        const audioBuffer = await audioContext.decodeAudioData(base64ToArrayBuffer(output.audioBase64));
        if (!transformedAtLeastOnce) {
          fallbackGain.gain.setValueAtTime(0, audioContext.currentTime);
          transformedAtLeastOnce = true;
        }
        const source = audioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(destination);
        source.start();
      } catch (error) {
        if (transformedAtLeastOnce) fallbackGain.gain.setValueAtTime(1, audioContext.currentTime);
        if (!failureNotified) {
          failureNotified = true;
          input.onError(voiceConversionFailureMessage(error));
        }
      }
    });
  };
  recorder.start(850);

  return {
    stream: destination.stream,
    stop: () => {
      stopped = true;
      if (recorder.state !== "inactive") recorder.stop();
      void audioContext.close();
    },
  };
}
