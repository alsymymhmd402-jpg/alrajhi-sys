import { Button } from "@/components/ui/button";
import { MissedCallNotice } from "@/components/MissedCallNotice";
import { startCallRingtone, type RingtoneHandle } from "@/lib/callRingtone";
import { trpc } from "@/lib/trpc";
import { Mic, MicOff, PhoneCall, PhoneOff } from "lucide-react";
import { io, Socket } from "socket.io-client";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

export function GuestIncomingCall({ publicId, accessToken }: { publicId: string; accessToken: string }) {
  const [callId, setCallId] = useState<number | null>(null);
  const [connected, setConnected] = useState(false);
  const [muted, setMuted] = useState(false);
  const [missed, setMissed] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const socketRef = useRef<Socket | null>(null); const peerRef = useRef<RTCPeerConnection | null>(null); const streamRef = useRef<MediaStream | null>(null); const audioRef = useRef<HTMLAudioElement>(null);
  const callIdRef = useRef<number | null>(null);
  const ringtoneRef = useRef<RingtoneHandle | null>(null);
  const iceQuery = trpc.calls.iceConfig.useQuery({ publicId, accessToken });
  const cleanup = () => { ringtoneRef.current?.stop(); ringtoneRef.current = null; peerRef.current?.close(); peerRef.current = null; streamRef.current?.getTracks().forEach(track => track.stop()); streamRef.current = null; callIdRef.current = null; setConnected(false); setAccepting(false); setMuted(false); setCallId(null); };
  useEffect(() => { const socket = io({ path: "/api/realtime", transports: ["websocket"], auth: { role: "guest", publicId, accessToken } }); socketRef.current = socket; socket.on("call:incoming", ({ callId: incomingId }) => { setMissed(false); callIdRef.current = incomingId; setCallId(incomingId); toast.message("لديك مكالمة واردة من فريق الدعم."); }); socket.on("webrtc:offer", async ({ callId: offeredId, sdp }) => { if (offeredId !== callIdRef.current || !peerRef.current) return; await peerRef.current.setRemoteDescription(sdp); const answer = await peerRef.current.createAnswer(); await peerRef.current.setLocalDescription(answer); socket.emit("webrtc:answer", { callId: offeredId, sdp: answer }); setConnected(true); }); socket.on("webrtc:ice", async ({ candidate }) => { if (peerRef.current) await peerRef.current.addIceCandidate(candidate); }); socket.on("call:ended", ({ reason }) => { if (typeof reason === "string" && reason.startsWith("مكالمة فائتة")) setMissed(true); cleanup(); if (reason) toast.message(reason); }); return () => { socket.disconnect(); cleanup(); }; }, [publicId, accessToken]);
  useEffect(() => { if (callId && !connected) { ringtoneRef.current ??= startCallRingtone("incoming"); return; } ringtoneRef.current?.stop(); ringtoneRef.current = null; }, [callId, connected]);
  
  
  const accept = async () => { if (!callId || !socketRef.current) return; try { setAccepting(true); ringtoneRef.current?.stop(); ringtoneRef.current = null; const stream = await navigator.mediaDevices.getUserMedia({ audio: true }); streamRef.current = stream; const peer = new RTCPeerConnection({ iceServers: iceQuery.data?.iceServers as RTCIceServer[] | undefined }); peerRef.current = peer; stream.getTracks().forEach(track => peer.addTrack(track, stream)); peer.onicecandidate = event => { if (event.candidate) socketRef.current?.emit("webrtc:ice", { callId, candidate: event.candidate.toJSON() }); }; peer.ontrack = event => { if (audioRef.current) audioRef.current.srcObject = event.streams[0]; }; socketRef.current.emit("call:guest-accept", { callId }); } catch { setAccepting(false); toast.error("يرجى السماح بالميكروفون لقبول المكالمة."); } };
  const reject = () => { if (callId) socketRef.current?.emit("call:guest-reject", { callId }); cleanup(); };
  const end = () => { if (callId) socketRef.current?.emit("call:end", { callId, reason: "أنهى العميل المكالمة." }); cleanup(); };
  const toggleMute = () => { const next = !muted; streamRef.current?.getAudioTracks().forEach(track => { track.enabled = !next; }); setMuted(next); };
  if (!callId && missed) return <MissedCallNotice recipient="guest" onClose={() => setMissed(false)} />;
  if (!callId) return null;
  return <aside className="fixed inset-0 z-[100] flex min-h-dvh items-center justify-center overflow-hidden bg-[#063f39] px-5 py-8 text-white" dir="rtl" role="dialog" aria-modal="true" aria-label="مكالمة واردة"><audio ref={audioRef} autoPlay /><div className="pointer-events-none absolute inset-0 opacity-35 [background:radial-gradient(circle_at_50%_20%,#21a58b_0%,transparent_32%),radial-gradient(circle_at_10%_95%,#0b7668_0%,transparent_26%)]" /><div className="relative flex w-full max-w-sm flex-col items-center text-center"><div className={`${!connected ? "animate-pulse" : ""} flex size-32 items-center justify-center rounded-[2.25rem] bg-white p-4 shadow-[0_20px_60px_rgba(0,0,0,0.28)]`}><img src="/manus-storage/alwaleed-philanthropies-mark_d87d264e.jpg" alt="مؤسسة الوليد بن طلال الإنسانية" className="size-full object-contain" /></div><p className="mt-7 text-xl font-extrabold tracking-tight">مراسلة المؤسسة</p><p className="mt-2 text-sm font-medium text-emerald-100">فريق خدمة العملاء</p><div className="mt-14 flex min-h-24 flex-col items-center justify-center"><span className="flex size-12 items-center justify-center rounded-full bg-white/12"><PhoneCall className="size-5 animate-pulse" /></span><h2 className="mt-4 text-lg font-bold">{connected ? "المكالمة متصلة" : accepting ? "جارٍ ربط المكالمة" : "مكالمة واردة"}</h2><p className="mt-2 text-sm text-emerald-100/85">{connected ? "أنت الآن متصل بفريق خدمة العملاء" : accepting ? "يتم الآن إنشاء اتصال صوتي آمن" : "يرن هاتفك بانتظار قرارك"}</p></div><div className="mt-16 flex items-start justify-center gap-11">{connected ? <><button type="button" onClick={toggleMute} className="flex w-20 flex-col items-center gap-2 text-sm font-semibold text-emerald-50"><span className={`flex size-15 items-center justify-center rounded-full border border-white/25 ${muted ? "bg-white text-[#075e54]" : "bg-white/14"}`}>{muted ? <MicOff className="size-6" /> : <Mic className="size-6" />}</span>{muted ? "إلغاء الكتم" : "كتم الصوت"}</button><CallActionButton tone="end" label="إنهاء المكالمة" onClick={end} icon={<PhoneOff className="size-7" />} /></> : <><CallActionButton tone="decline" label="رفض" onClick={reject} icon={<PhoneOff className="size-7" />} /><CallActionButton tone="accept" label={accepting ? "جارٍ القبول" : "قبول"} onClick={accept} disabled={accepting} icon={<Mic className="size-7" />} /></>}</div></div></aside>;
}

function CallActionButton({ tone, label, onClick, icon, disabled = false }: { tone: "accept" | "decline" | "end"; label: string; onClick: () => void; icon: React.ReactNode; disabled?: boolean }) {
  const color = tone === "accept" ? "bg-[#20b864]" : "bg-[#e53935]";
  return <button type="button" onClick={onClick} disabled={disabled} className="flex w-24 flex-col items-center gap-2 text-sm font-bold text-white disabled:opacity-60"><span className={`flex size-16 items-center justify-center rounded-full ${color} shadow-lg shadow-black/20`}>{icon}</span>{label}</button>;
}
