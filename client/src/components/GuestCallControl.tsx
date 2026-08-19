import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { Phone, PhoneOff, Radio, Volume2 } from "lucide-react";
import { io, Socket } from "socket.io-client";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

type CallStatus = "idle" | "requesting" | "ringing" | "connecting" | "connected" | "reconnecting" | "failed" | "missed" | "ended";

export function GuestCallControl({ publicId, accessToken, disabled }: { publicId: string; accessToken: string; disabled?: boolean }) {
  const [status, setStatus] = useState<CallStatus>("idle");
  const [muted, setMuted] = useState(false);
  const [durationSeconds, setDurationSeconds] = useState(0);
  const [networkStatus, setNetworkStatus] = useState("في انتظار الاتصال");
  const socketRef = useRef<Socket | null>(null);
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const callIdRef = useRef<number | null>(null);
  const iceQuery = trpc.calls.iceConfig.useQuery({ publicId, accessToken }, { enabled: Boolean(publicId && accessToken) });
  const createCall = trpc.calls.createDirect.useMutation({ onError: error => toast.error(error.message) });

  const cleanup = () => {
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

  if (status === "idle" || status === "ended" || status === "missed") {
    return <div className="flex items-center gap-2">{status === "missed" && <span className="rounded-xl bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">مكالمة فائتة</span>}<Button onClick={beginCall} disabled={disabled || createCall.isPending || iceQuery.isLoading} className="rounded-xl bg-blue-600 hover:bg-blue-700"><Phone className="ml-2 size-4" />{status === "missed" ? "إعادة الاتصال" : "اتصال صوتي بالدعم"}</Button></div>;
  }

  return (
    <div className="flex items-center gap-2 rounded-2xl border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800">
      <audio ref={remoteAudioRef} autoPlay />
      <Radio className="size-4 animate-pulse" />
      <span className="min-w-24">{status === "requesting" ? "يتم التحضير..." : status === "ringing" ? "في انتظار الفريق" : status === "connecting" ? "جارٍ الاتصال" : status === "reconnecting" ? "إعادة الاتصال" : status === "failed" ? "فشلت المكالمة" : "المكالمة متصلة"}</span>
      {status === "connected" && <span className="text-xs text-blue-600">{String(Math.floor(durationSeconds / 60)).padStart(2, "0")}:{String(durationSeconds % 60).padStart(2, "0")} · {networkStatus}</span>}
      {status === "connected" && <Button variant="ghost" size="icon" onClick={toggleMute} className="size-8 text-blue-700 hover:bg-blue-100"><Volume2 className={`size-4 ${muted ? "opacity-35" : ""}`} /><span className="sr-only">كتم الميكروفون</span></Button>}
      <Button variant="ghost" size="icon" onClick={endCall} className="size-8 text-red-600 hover:bg-red-50"><PhoneOff className="size-4" /><span className="sr-only">إنهاء المكالمة</span></Button>
    </div>
  );
}
