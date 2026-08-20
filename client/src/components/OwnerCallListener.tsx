import { Button } from "@/components/ui/button";
import { MissedCallNotice } from "@/components/MissedCallNotice";
import { startVoiceConversion, VoiceConversionSession } from "@/lib/voiceConversion";
import { trpc } from "@/lib/trpc";
import { Loader2, Mic, PhoneCall, PhoneOff, UserRound } from "lucide-react";
import { io, Socket } from "socket.io-client";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

type IncomingCall = { callId: number; conversationId: number; guestName: string };

export function OwnerCallListener() {
  const [incoming, setIncoming] = useState<IncomingCall | null>(null);
  const [active, setActive] = useState(false);
  const [missed, setMissed] = useState(false);
  const [voiceFallbackNotice, setVoiceFallbackNotice] = useState<string | null>(null);
  const tokenMutation = trpc.calls.ownerRealtimeToken.useMutation({ onError: error => toast.error(error.message) });
  const iceQuery = trpc.calls.ownerIceConfig.useQuery();
  const activeVoice = trpc.calls.voiceForConversation.useQuery({ conversationId: incoming?.conversationId ?? 0 }, { enabled: Boolean(incoming) });
  const convertChunk = trpc.voice.convertChunk.useMutation();
  const socketRef = useRef<Socket | null>(null);
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const conversionRef = useRef<VoiceConversionSession | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const activeCallRef = useRef<IncomingCall | null>(null);

  const cleanup = () => {
    conversionRef.current?.stop();
    conversionRef.current = null;
    peerRef.current?.close();
    peerRef.current = null;
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
    activeCallRef.current = null;
    setActive(false);
    setVoiceFallbackNotice(null);
  };

  useEffect(() => {
    tokenMutation.mutate();
    return () => { socketRef.current?.disconnect(); cleanup(); };
  }, []);

  useEffect(() => {
    const token = tokenMutation.data?.token;
    if (!token) return;
    const socket = io({ path: "/api/realtime", transports: ["websocket"], auth: { role: "owner", token } });
    socketRef.current = socket;
    socket.on("call:incoming", (call: IncomingCall) => { setMissed(false); setVoiceFallbackNotice(null); setIncoming(call); toast.message(`مكالمة واردة من ${call.guestName}`); });
    socket.on("webrtc:offer", async ({ callId, sdp }) => {
      if (!activeCallRef.current || activeCallRef.current.callId !== callId || !peerRef.current) return;
      await peerRef.current.setRemoteDescription(sdp);
      const answer = await peerRef.current.createAnswer();
      await peerRef.current.setLocalDescription(answer);
      socket.emit("webrtc:answer", { callId, sdp: answer });
      setActive(true);
    });
    socket.on("webrtc:ice", async ({ candidate }) => { if (peerRef.current) await peerRef.current.addIceCandidate(candidate); });
    socket.on("call:ended", ({ reason }) => { if (typeof reason === "string" && reason.startsWith("مكالمة فائتة")) setMissed(true); cleanup(); setIncoming(null); if (reason) toast.message(reason); });
    socket.on("connect_error", error => toast.error(error.message || "تعذّر ربط استقبال المكالمات."));
    return () => {
      socket.disconnect();
    };
  }, [tokenMutation.data?.token]);

  const accept = async () => {
    if (!incoming || !socketRef.current) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const peer = new RTCPeerConnection({ iceServers: iceQuery.data?.iceServers as RTCIceServer[] | undefined });
      peerRef.current = peer;
      let outgoingStream = stream;
      if (activeVoice.data) {
        conversionRef.current = await startVoiceConversion({ inputStream: stream, modelId: activeVoice.data.id, convertChunk: payload => convertChunk.mutateAsync(payload), onError: message => { setVoiceFallbackNotice(`عاد الاتصال إلى الصوت الطبيعي. ${message}`); toast.error(`عاد الاتصال إلى الصوت الطبيعي. ${message}`); } });
        outgoingStream = conversionRef.current.stream;
      }
      outgoingStream.getTracks().forEach(track => peer.addTrack(track, outgoingStream));
      peer.onicecandidate = event => { if (event.candidate) socketRef.current?.emit("webrtc:ice", { callId: incoming.callId, candidate: event.candidate.toJSON() }); };
      peer.ontrack = event => { if (remoteAudioRef.current) remoteAudioRef.current.srcObject = event.streams[0]; };
      activeCallRef.current = incoming;
      socketRef.current.emit("call:accept", { callId: incoming.callId });
    } catch {
      toast.error("يلزم السماح بالميكروفون لقبول المكالمة.");
    }
  };

  const reject = () => { if (incoming) socketRef.current?.emit("call:reject", { callId: incoming.callId }); setIncoming(null); };
  const end = () => { if (activeCallRef.current) socketRef.current?.emit("call:end", { callId: activeCallRef.current.callId, reason: "أنهى فريق الدعم المكالمة." }); cleanup(); setIncoming(null); };

  if (!incoming && missed) return <MissedCallNotice recipient="owner" placement="owner" onClose={() => setMissed(false)} />;
  if (!incoming) return null;
  return (
    <aside className="fixed bottom-5 left-5 z-50 w-[min(360px,calc(100vw-2.5rem))] rounded-3xl border border-blue-200 bg-white p-5 shadow-2xl shadow-blue-300/30" dir="rtl">
      <audio ref={remoteAudioRef} autoPlay />
      <div className="flex items-start gap-3"><span className="flex size-11 items-center justify-center rounded-2xl bg-blue-100 text-blue-700"><PhoneCall className="size-5 animate-pulse" /></span><div><p className="font-bold text-slate-900">مكالمة دعم واردة</p><p className="mt-1 flex items-center gap-1 text-sm text-slate-500"><UserRound className="size-3.5" />{incoming.guestName}</p></div></div>
      {activeVoice.data && <p className="mt-4 rounded-xl bg-violet-50 px-3 py-2 text-xs font-semibold text-violet-800">سيسمع العميل صوت فريق الدعم المختار: {activeVoice.data.name}. وإذا تعذر ElevenLabs، تستمر المكالمة بالصوت الطبيعي.</p>}
      {voiceFallbackNotice && <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900">{voiceFallbackNotice}</p>}
      <div className="mt-5 flex gap-2">
        {active ? <Button onClick={end} className="flex-1 rounded-xl bg-red-600 hover:bg-red-700"><PhoneOff className="ml-2 size-4" />إنهاء المكالمة</Button> : <><Button onClick={accept} className="flex-1 rounded-xl bg-blue-600 hover:bg-blue-700"><Mic className="ml-2 size-4" />قبول</Button><Button variant="outline" onClick={reject} className="rounded-xl border-red-200 text-red-600"><PhoneOff className="size-4" /><span className="sr-only">رفض</span></Button></>}
      </div>
      {tokenMutation.isPending && <Loader2 className="mt-3 size-4 animate-spin text-blue-600" />}
    </aside>
  );
}
