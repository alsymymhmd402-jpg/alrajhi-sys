import { Button } from "@/components/ui/button";
import { startCallRingtone, type RingtoneHandle } from "@/lib/callRingtone";
import { trpc } from "@/lib/trpc";
import { brandAssets } from "@/lib/brandAssets";
import { Mic, Phone, PhoneOff, Radio, Volume2 } from "lucide-react";
import { io, Socket } from "socket.io-client";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

type CallStatus = "idle" | "requesting" | "ringing" | "connecting" | "connected" | "reconnecting" | "failed" | "missed" | "ended";
const INSTITUTION_LOGO_URL = brandAssets.institutionSeal;

const callStatusCopy: Record<Exclude<CallStatus, "idle" | "ended" | "missed" | "failed">, { title: string; detail: string }> = {
  requesting: { title: "جارٍ تجهيز الاتصال", detail: "يتم تشغيل الميكروفون والاتصال بخدمة العملاء" },
  ringing: { title: "في انتظار رد فريق الدعم", detail: "سيستمر الرنين حتى يتم الرد أو إنهاء الاتصال" },
  connecting: { title: "جارٍ ربط المكالمة", detail: "يتم الآن إنشاء اتصال صوتي آمن" },
  connected: { title: "المكالمة متصلة", detail: "أنت الآن متصل بفريق خدمة العملاء" },
  reconnecting: { title: "جارٍ إعادة الاتصال", detail: "نحاول استعادة الاتصال الصوتي" },
};

export function GuestCallControl({ publicId, accessToken, disabled, compact = false }: { publicId: string; accessToken: string; disabled?: boolean; compact?: boolean }) {
  const [status, setStatus] = useState<CallStatus>("idle");
  const [muted, setMuted] = useState(false);
  const [durationSeconds, setDurationSeconds] = useState(0);
  const [networkStatus, setNetworkStatus] = useState("في انتظار الاتصال");
  const socketRef = useRef<Socket | null>(null);
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const callIdRef = useRef<number | null>(null);
  const ringtoneRef = useRef<RingtoneHandle | null>(null);
  const iceQuery = trpc.calls.iceConfig.useQuery({ publicId, accessToken }, { enabled: Boolean(publicId && accessToken) });
  const createCall = trpc.calls.createDirect.useMutation({ onError: error => toast.error(error.message) });

  const cleanup = () => {
    ringtoneRef.current?.stop();
    ringtoneRef.current = null;
    peerRef.current?.close();
    peerRef.current = null;
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
    socketRef.current?.disconnect();
    socketRef.current = null;
    callIdRef.current = null;
    setMuted(false);
    setDurationSeconds(0);
    setNetworkStatus("في انتظار الاتصال");
  };

  useEffect(() => {
    return () => {
      cleanup();
    };
  }, []);

  useEffect(() => {
    if (status !== "connected") return;
    const started = Date.now() - durationSeconds * 1000;
    const timer = window.setInterval(() => setDurationSeconds(Math.floor((Date.now() - started) / 1000)), 1000);
    return () => window.clearInterval(timer);
  }, [status]);

  useEffect(() => {
    if (status === "ringing") {
      ringtoneRef.current ??= startCallRingtone("outgoing");
      return;
    }
    ringtoneRef.current?.stop();
    ringtoneRef.current = null;
  }, [status]);

  const setupPeer = (socket: Socket, stream: MediaStream) => {
    const peer = new RTCPeerConnection({ iceServers: iceQuery.data?.iceServers as RTCIceServer[] | undefined });
    peerRef.current = peer;
    stream.getTracks().forEach(track => peer.addTrack(track, stream));
    peer.onicecandidate = event => {
      if (event.candidate && callIdRef.current) socket.emit("webrtc:ice", { callId: callIdRef.current, candidate: event.candidate.toJSON() });
    };
    peer.ontrack = event => {
      if (remoteAudioRef.current) remoteAudioRef.current.srcObject = event.streams[0];
    };
    peer.onconnectionstatechange = () => {
      if (peer.connectionState === "connected") { setStatus("connected"); setNetworkStatus("متصل"); }
      if (peer.connectionState === "disconnected") { setStatus("reconnecting"); setNetworkStatus("جارٍ إعادة الاتصال"); }
      if (peer.connectionState === "failed") { setStatus("failed"); setNetworkStatus("فشل الاتصال"); }
    };
    return peer;
  };

  const beginCall = async () => {
    try {
      setStatus("requesting");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const call = await createCall.mutateAsync({ publicId, accessToken });
      callIdRef.current = call.id;
      const socket = io({ path: "/api/realtime", transports: ["websocket"], auth: { role: "guest", publicId, accessToken } });
      socketRef.current = socket;
      socket.on("connect", () => socket.emit("call:request", { callId: call.id }));
      socket.on("call:ringing", () => setStatus("ringing"));
      socket.on("call:accepted", async () => {
        ringtoneRef.current?.stop();
        ringtoneRef.current = null;
        const peer = setupPeer(socket, stream);
        const offer = await peer.createOffer();
        await peer.setLocalDescription(offer);
        socket.emit("webrtc:offer", { callId: call.id, sdp: offer });
        setStatus("connecting");
      });
      socket.on("webrtc:answer", async ({ sdp }) => { if (peerRef.current) await peerRef.current.setRemoteDescription(sdp); });
      socket.on("webrtc:ice", async ({ candidate }) => { if (peerRef.current) await peerRef.current.addIceCandidate(candidate); });
      socket.on("call:ended", ({ reason }) => { cleanup(); setStatus(typeof reason === "string" && reason.startsWith("مكالمة فائتة") ? "missed" : "ended"); if (reason) toast.message(reason); });
      socket.on("connect_error", error => { cleanup(); setStatus("idle"); toast.error(error.message || "تعذّر الاتصال بخدمة المكالمات."); });
    } catch (error) {
      cleanup();
      setStatus("idle");
      toast.error(error instanceof Error && error.name === "NotAllowedError" ? "يرجى السماح باستخدام الميكروفون للاتصال." : "تعذّر بدء المكالمة.");
    }
  };

  const endCall = () => {
    if (callIdRef.current) socketRef.current?.emit("call:end", { callId: callIdRef.current, reason: "أنهى العميل المكالمة." });
    cleanup();
    setStatus("ended");
  };

  const toggleMute = () => {
    const next = !muted;
    streamRef.current?.getAudioTracks().forEach(track => { track.enabled = !next; });
    setMuted(next);
  };

  const isActive = status === "requesting" || status === "ringing" || status === "connecting" || status === "connected" || status === "reconnecting";

  if (!isActive) {
    if (compact) {
      return <Button onClick={beginCall} disabled={disabled || createCall.isPending || iceQuery.isLoading} variant="ghost" size="icon" className="size-9 text-white hover:bg-white/15 hover:text-white" aria-label="بدء مكالمة صوتية"><Phone className="size-5" /></Button>;
    }
    return <div className="flex items-center gap-2">{status === "missed" && <span className="rounded-xl bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">مكالمة فائتة</span>}{status === "failed" && <span className="rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">تعذّر إتمام الاتصال</span>}<Button onClick={beginCall} disabled={disabled || createCall.isPending || iceQuery.isLoading} className="rounded-xl bg-[#075e54] hover:bg-[#064b43]"><Phone className="ml-2 size-4" />{status === "missed" || status === "failed" ? "إعادة الاتصال" : "اتصال صوتي بالدعم"}</Button></div>;
  }

  const copy = callStatusCopy[status];
  const time = `${String(Math.floor(durationSeconds / 60)).padStart(2, "0")}:${String(durationSeconds % 60).padStart(2, "0")}`;

  return (
    <section className="fixed inset-0 z-[100] flex min-h-dvh items-center justify-center overflow-hidden bg-[#063f39] px-5 py-8 text-white" dir="rtl" role="dialog" aria-modal="true" aria-label="شاشة الاتصال الصوتي">
      <audio ref={remoteAudioRef} autoPlay />
      <div className="pointer-events-none absolute inset-0 opacity-35 [background:radial-gradient(circle_at_50%_20%,#21a58b_0%,transparent_32%),radial-gradient(circle_at_10%_95%,#0b7668_0%,transparent_26%)]" />
      <div className="relative flex w-full max-w-sm flex-col items-center text-center">
        <div className={`relative mb-7 flex size-32 items-center justify-center rounded-[2.25rem] bg-white p-4 shadow-[0_20px_60px_rgba(0,0,0,0.28)] ${status === "ringing" ? "animate-pulse" : ""}`}>
          <img src={INSTITUTION_LOGO_URL} alt="مؤسسة الوليد بن طلال الإنسانية" className="size-full object-contain" />
          {status === "ringing" && <span className="absolute -inset-3 -z-10 rounded-[2.75rem] border border-white/40" />}
        </div>
        <p className="text-xl font-extrabold tracking-tight">مراسلة المؤسسة</p>
        <p className="mt-2 text-sm font-medium text-emerald-100">مؤسسة الوليد بن طلال الإنسانية</p>

        <div className="mt-14 flex min-h-28 flex-col items-center justify-center">
          <span className="flex size-12 items-center justify-center rounded-full bg-white/12 text-white">
            {status === "connected" ? <PhoneCallIcon /> : <Radio className="size-5 animate-pulse" />}
          </span>
          <h2 className="mt-4 text-lg font-bold">{copy.title}</h2>
          <p className="mt-2 max-w-64 text-sm leading-6 text-emerald-100/85">{status === "connected" ? `${time} · ${networkStatus}` : copy.detail}</p>
        </div>

        <div className="mt-16 flex items-start justify-center gap-11">
          {status === "connected" && <button type="button" onClick={toggleMute} className="flex w-20 flex-col items-center gap-2 text-sm font-semibold text-emerald-50" aria-label={muted ? "إلغاء كتم الميكروفون" : "كتم الميكروفون"}>
            <span className={`flex size-15 items-center justify-center rounded-full border border-white/25 ${muted ? "bg-white text-[#075e54]" : "bg-white/14"}`}><Mic className={`size-6 ${muted ? "opacity-45" : ""}`} /></span>
            {muted ? "إلغاء الكتم" : "كتم الصوت"}
          </button>}
          <button type="button" onClick={endCall} className="flex w-24 flex-col items-center gap-2 text-sm font-bold text-white" aria-label={status === "connected" ? "إنهاء المكالمة" : "إلغاء الاتصال"}>
            <span className="flex size-16 items-center justify-center rounded-full bg-[#e53935] shadow-lg shadow-red-950/25"><PhoneOff className="size-7" /></span>
            {status === "connected" ? "إنهاء المكالمة" : "إلغاء الاتصال"}
          </button>
        </div>
      </div>
    </section>
  );
}

function PhoneCallIcon() {
  return <Phone className="size-5" />;
}
