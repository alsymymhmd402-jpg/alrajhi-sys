import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { CustomerUiComponent, CustomerUiDocument } from "@shared/customerUi";
import { Bell, Check, ChevronLeft, ClipboardCheck, MessageCircle, UserRound } from "lucide-react";
import { CSSProperties, useMemo, useState } from "react";
import { useLocation } from "wouter";

const fontNames = { modern: "Arial, sans-serif", classic: "Georgia, serif", bold: "Arial, sans-serif", rounded: "ui-rounded, Arial, sans-serif" };
const filterCss = { none: "none", warm: "sepia(.26) saturate(1.18)", cool: "hue-rotate(168deg) saturate(.82)", mono: "grayscale(1)", vivid: "saturate(1.55) contrast(1.06)", soft: "brightness(1.06) contrast(.88)" } as const;

function componentStyle(component: CustomerUiComponent, contentHeight: number): CSSProperties {
  const style = component.style;
  return { position: "absolute", left: `${component.x}%`, top: `${(component.y / contentHeight) * 100}%`, width: `${component.width}%`, height: `${(component.height / contentHeight) * 100}%`, color: style.color, background: style.background, borderRadius: style.borderRadius, opacity: style.opacity, padding: style.padding, fontFamily: fontNames[style.fontFamily ?? "modern"], fontSize: style.fontSize, fontWeight: style.fontWeight, lineHeight: style.lineHeight, letterSpacing: style.letterSpacing, textAlign: style.textAlign, overflow: "hidden", border: `${style.borderWidth ?? 0}px solid ${style.borderColor ?? "#ffffff"}`, boxShadow: style.shadow ? "0 12px 25px rgba(15,23,42,.16)" : undefined };
}

function CustomerUiElement({ component, contentHeight, onAction }: { component: CustomerUiComponent; contentHeight: number; onAction: () => void }) {
  if (!component.visible) return null;
  const content = component.type === "image" ? <div className="h-full w-full overflow-hidden" style={{ borderRadius: Math.max(0, (component.style.borderRadius ?? 0) - (component.style.borderWidth ?? 0)) }}><img src={component.content} alt={component.label} className="h-full w-full" style={{ objectFit: component.style.objectFit, objectPosition: `${component.style.objectPositionX ?? 50}% ${component.style.objectPositionY ?? 50}%`, filter: filterCss[component.style.filterPreset ?? "none"], transform: `scale(${component.style.imageScale ?? 1})` }} /></div> : component.type === "status" ? <div className="h-full w-full space-y-2 overflow-hidden"><p className="font-bold">{component.content || "حالة الطلب"}</p>{component.statusSteps?.map((step, index) => <div key={step.id} className="flex items-center gap-2 text-[11px]"><span className="flex size-4 shrink-0 items-center justify-center rounded-full text-[9px] text-white" style={{ background: index <= (component.statusCurrent ?? 0) ? step.color : "#cbd5e1" }}>{index <= (component.statusCurrent ?? 0) ? <Check className="size-2.5" /> : index + 1}</span><span className={index <= (component.statusCurrent ?? 0) ? "font-bold" : "text-slate-400"}>{step.label}</span></div>)}</div> : component.type === "divider" || component.type === "spacer" ? <div className="h-full w-full" /> : <div className="flex h-full w-full items-center whitespace-pre-wrap" style={{ justifyContent: component.style.textAlign === "center" ? "center" : component.style.textAlign === "left" ? "flex-start" : "flex-end" }}>{component.content}</div>;
  const interactive = component.action.type !== "none" || component.type === "button" || component.type === "link";
  return interactive ? <button type="button" onClick={onAction} className="absolute block text-inherit transition active:scale-[.98]" style={componentStyle(component, contentHeight)}>{content}</button> : <div className="absolute" style={componentStyle(component, contentHeight)}>{content}</div>;
}

export function CustomerUiPublishedView({ publicId, accessToken }: { publicId: string; accessToken: string }) {
  const [, setLocation] = useLocation();
  const publishedQuery = trpc.customerUi.guestPublished.useQuery({ publicId, accessToken }, { refetchInterval: 20_000 });
  const document = publishedQuery.data?.document;
  const go = (component: CustomerUiComponent) => {
    const route = component.action.type;
    if (route === "chat") setLocation(`/client/${publicId}/chat`);
    else if (route === "institution") setLocation(`/client/${publicId}/institution`);
    else if (route === "application") setLocation(`/client/${publicId}/application`);
    else if (route === "profile") setLocation(`/client/${publicId}/profile`);
    else if (route === "url" && component.action.value) window.open(component.action.value, "_blank", "noopener,noreferrer");
  };
  if (!document) return null;
  const contentHeight = document.canvas.contentHeight ?? 100;
  return <section className="mb-5 overflow-hidden rounded-3xl border border-emerald-100 bg-white shadow-sm"><div className="flex items-center justify-between border-b border-emerald-50 px-4 py-3"><div><p className="text-xs font-bold text-[#075e54]">واجهة مخصصة لك</p><p className="mt-0.5 text-[11px] text-slate-400">آخر تحديث منشور من المؤسسة</p></div><ClipboardCheck className="size-5 text-[#128c7e]" /></div><div className="max-h-[780px] overflow-y-auto"><div className="relative w-full" style={{ minHeight: `${Math.max(460, contentHeight * 4.8)}px`, background: document.canvas.background }}>{document.components.map(component => <CustomerUiElement key={component.id} component={component} contentHeight={contentHeight} onAction={() => go(component)} />)}</div></div></section>;
}

export function ClientUpdateNotifications({ publicId, accessToken }: { publicId: string; accessToken: string }) {
  const [open, setOpen] = useState(false);
  const [, setLocation] = useLocation();
  const notificationsQuery = trpc.customerUi.guestNotifications.useQuery({ publicId, accessToken }, { refetchInterval: 20_000 });
  const markRead = trpc.customerUi.markNotificationRead.useMutation({ onSuccess: () => void notificationsQuery.refetch() });
  const unread = useMemo(() => (notificationsQuery.data ?? []).filter(item => !item.isRead).length, [notificationsQuery.data]);
  return <div className="relative"><Button type="button" variant="ghost" size="icon" onClick={() => setOpen(value => !value)} className="relative size-9 text-white hover:bg-white/15 hover:text-white" aria-label="إشعارات التطبيق"><Bell className="size-4" />{unread > 0 && <span className="absolute left-1 top-1 flex min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white">{unread > 9 ? "9+" : unread}</span>}</Button>{open && <div className="absolute left-0 top-11 z-50 w-72 overflow-hidden rounded-2xl border border-slate-100 bg-white text-right text-slate-800 shadow-xl"><div className="flex items-center justify-between border-b border-slate-100 px-4 py-3"><p className="font-bold">تحديثات التطبيق</p><span className="text-xs text-slate-400">{unread} جديد</span></div><div className="max-h-72 overflow-y-auto">{notificationsQuery.data?.length ? notificationsQuery.data.map(item => <button key={item.id} type="button" onClick={() => { if (!item.isRead) markRead.mutate({ publicId, accessToken, notificationId: item.id }); setOpen(false); setLocation(`/client/${publicId}${item.route.startsWith("/") ? item.route : "/institution"}`); }} className={`w-full border-b border-slate-50 px-4 py-3 text-right transition hover:bg-slate-50 ${item.isRead ? "" : "bg-emerald-50/60"}`}><div className="flex gap-2"><span className={`mt-1 size-2 shrink-0 rounded-full ${item.isRead ? "bg-slate-200" : "bg-emerald-500"}`} /><div><p className="text-sm font-bold">{item.title}</p><p className="mt-1 text-xs leading-5 text-slate-500">{item.body}</p></div></div></button>) : <div className="p-6 text-center text-sm text-slate-400">لا توجد تحديثات حالياً.</div>}</div></div>}</div>;
}
