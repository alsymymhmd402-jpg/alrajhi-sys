import { Button } from "@/components/ui/button";
import { MissedCallNotice } from "@/components/MissedCallNotice";
import { startCallRingtone, type RingtoneHandle } from "@/lib/callRingtone";
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
  const [accepting, setAccepting] = useState(false);
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
  const incomingCallRef = useRef<IncomingCall | null>(null);
  const ringtoneRef = useRef<RingtoneHandle | null>(null);

  const cleanup = () => {
    ringtoneRef.current?.stop();
    ringtoneRef.current = null;
    conversionRef.current?.stop();
    conversionRef.current = null;
    peerRef.current?.close();
    peerRef.current = null;
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
    activeCallRef.current = null;
    setActive(false);
    setAccepting(false);
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
    socket.on("call:incoming", (call: IncomingCall) => { incomingCallRef.current = call; setMissed(false); setAccepting(false); setVoiceFallbackNotice(null); setIncoming(call); toast.message(`مكالمة واردة من ${call.guestName}`); });
    socket.on("webrtc:offer", async ({ callId, sdp }) => {
      if (!activeCallRef.current || activeCallRef.current.callId !== callId || !peerRef.current) return;
      await peerRef.current.setRemoteDescription(sdp);
      const answer = await peerRef.current.createAnswer();
      await peerRef.current.setLocalDescription(answer);
      socket.emit("webrtc:answer", { callId, sdp: answer });
      setAccepting(false);
      setActive(true);
    });
    socket.on("webrtc:ice", async ({ candidate }) => { if (peerRef.current) await peerRef.current.addIceCandidate(candidate); });
    socket.on("call:ended", ({ callId, reason }) => { const current = incomingCallRef.current ?? activeCallRef.current; if (!current || current.callId !== callId) return; if (typeof reason === "string" && reason.startsWith("مكالمة فائتة")) setMissed(true); cleanup(); incomingCallRef.current = null; setIncoming(null); if (reason) toast.message(reason); });
    socket.on("connect_error", error => toast.error(error.message || "تعذّر ربط استقبال المكالمات."));
    return () => {
      socket.disconnect();
    };
  }, [tokenMutation.data?.token]);

  useEffect(() => {
    if (incoming && !active) {
      ringtoneRef.current ??= startCallRingtone("incoming");
      return;
    }
    ringtoneRef.current?.stop();
    ringtoneRef.current = null;
  }, [incoming, active]);

  const accept = async () => {
    if (!incoming || !socketRef.current) return;
    try {
      setAccepting(true);
      ringtoneRef.current?.stop();
      ringtoneRef.current = null;
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
      setAccepting(false);
      toast.error("يلزم السماح بالميكروفون لقبول المكالمة.");
    }
  };

  const reject = () => { ringtoneRef.current?.stop(); ringtoneRef.current = null; setAccepting(false); if (incoming) socketRef.current?.emit("call:reject", { callId: incoming.callId }); incomingCallRef.current = null; setIncoming(null); };
  const end = () => { if (activeCallRef.current) socketRef.current?.emit("call:end", { callId: activeCallRef.current.callId, reason: "أنهى فريق الدعم المكالمة." }); cleanup(); incomingCallRef.current = null; setIncoming(null); };

  if (!incoming && missed) return <MissedCallNotice recipient="owner" placement="owner" onClose={() => setMissed(false)} />;
  if (!incoming) return null;
  return (
    <aside className="fixed bottom-5 left-5 z-50 w-[min(390px,calc(100vw-2.5rem))] overflow-hidden rounded-[1.8rem] border border-blue-200 bg-white shadow-2xl shadow-blue-300/30" dir="rtl" role="alertdialog" aria-label="مكالمة دعم واردة">
      <audio ref={remoteAudioRef} autoPlay />
      <div className="border-b border-blue-100 bg-gradient-to-l from-[#155eef] to-[#0b5dcd] px-5 py-4 text-white"><div className="flex items-center gap-3"><span className="flex size-12 items-center justify-center rounded-2xl bg-white/15"><PhoneCall className="size-6 animate-pulse" /></span><div><p className="font-extrabold">{active ? "المكالمة متصلة" : accepting ? "جارٍ قبول المكالمة" : "مكالمة دعم واردة"}</p><p className="mt-0.5 text-xs font-medium text-blue-100">{active ? "الصوت متصل الآن" : accepting ? "يتم تجهيز الصوت والاتصال" : "يرن جهاز غرفة العمليات"}</p></div></div></div>
      <div className="p-5"><div className="flex items-center gap-3"><span className="flex size-11 items-center justify-center rounded-full bg-slate-100 text-slate-600"><UserRound className="size-5" /></span><div><p className="text-sm text-slate-500">العميل المتصل</p><p className="mt-0.5 font-bold text-slate-900">{incoming.guestName}</p></div></div>
      {activeVoice.data && <p className="mt-4 rounded-xl bg-violet-50 px-3 py-2 text-xs font-semibold leading-5 text-violet-800">سيسمع العميل صوت فريق الدعم المختار: {activeVoice.data.name}. وإذا تعذر ElevenLabs، تستمر المكالمة بالصوت الطبيعي.</p>}
      {voiceFallbackNotice && <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-xs font-semibold leading-5 text-amber-900">{voiceFallbackNotice}</p>}
      <div className="mt-5 flex gap-3">
        {active ? <Button onClick={end} className="h-13 flex-1 rounded-2xl bg-red-600 font-bold hover:bg-red-700"><PhoneOff className="ml-2 size-5" />إنهاء المكالمة</Button> : <><Button onClick={accept} disabled={accepting} className="h-13 flex-1 rounded-2xl bg-[#155eef] font-bold hover:bg-[#0b4fbd] disabled:opacity-65"><Mic className="ml-2 size-5" />{accepting ? "جارٍ القبول..." : "قبول المكالمة"}</Button><Button variant="outline" onClick={reject} disabled={accepting} className="h-13 rounded-2xl border-red-200 px-5 font-bold text-red-600 hover:bg-red-50 hover:text-red-700"><PhoneOff className="ml-1.5 size-5" />رفض</Button></>}
      </div>
      {tokenMutation.isPending && <Loader2 className="mt-3 size-4 animate-spin text-blue-600" />}
      </div>
    </aside>
  );
}
